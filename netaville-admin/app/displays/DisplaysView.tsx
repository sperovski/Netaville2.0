'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Button} from '@/components/Button';
import {Card, CardHeader} from '@/components/Card';
import {Drawer} from '@/components/Drawer';
import {Field, Input, Select} from '@/components/Field';
import {ImageUploader} from '@/components/ImageUploader';
import {SlideCard, type SlideEvent} from '@/components/SlideCard';
import {StatusPill} from '@/components/StatusPill';
import {timeAgo} from '@/lib/format';
import type {Playlist, Screen, Slide, SlideType} from '@/lib/types';

type Props = {
  screens: Screen[];
  playlists: Playlist[];
  events: SlideEvent[];
};

let slideCounter = 0;
function newSlideId(): string {
  slideCounter += 1;
  return `sl-${Date.now().toString(36)}${slideCounter.toString(36)}`;
}

function blankSlide(type: SlideType, events: SlideEvent[]): Slide {
  return {
    id: newSlideId(),
    type,
    durationSec: type === 'announcement' ? 12 : 8,
    enabled: true,
    eventId: type === 'announcement' ? events[0]?.id : undefined,
    headline: type === 'marketing' ? '' : undefined,
    cta: type === 'marketing' ? '' : undefined,
  };
}

export function DisplaysView({screens, playlists, events}: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    screens.find(screen => screen.paired)?.id ?? screens[0]?.id ?? null,
  );
  const [addOpen, setAddOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);
  const [editing, setEditing] = useState<Slide | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const screen = screens.find(candidate => candidate.id === selectedId) ?? null;
  const serverPlaylist = useMemo(
    () =>
      playlists.find(
        playlist =>
          playlist.screenId === screen?.id &&
          (screen?.activePlaylistId === null ||
            playlist.id === screen?.activePlaylistId),
      ) ?? playlists.find(playlist => playlist.screenId === screen?.id) ?? null,
    [playlists, screen],
  );

  const [slides, setSlides] = useState<Slide[]>(serverPlaylist?.slides ?? []);

  // Re-seed the editor whenever the server sends a different playlist, but
  // never while there are unsaved edits on screen.
  const lastPlaylistId = useRef<string | null>(serverPlaylist?.id ?? null);
  useEffect(() => {
    if (serverPlaylist?.id !== lastPlaylistId.current || !dirty) {
      lastPlaylistId.current = serverPlaylist?.id ?? null;
      setSlides(serverPlaylist?.slides ?? []);
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPlaylist?.id, serverPlaylist?.updatedAt]);

  // Drag-to-reorder state: which slide is moving and where it would land.
  const dragFrom = useRef<number | null>(null);
  const dragTo = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const patchSlides = (next: Slide[]) => {
    setSlides(next);
    setDirty(true);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) {
      return;
    }
    const next = [...slides];
    [next[index], next[target]] = [next[target]!, next[index]!];
    patchSlides(next);
  };

  const commitDrag = () => {
    const from = dragFrom.current;
    const to = dragTo.current;
    if (from === null || to === null || from === to) {
      return;
    }
    const next = [...slides];
    const [moved] = next.splice(from, 1);
    next.splice(to > from ? to - 1 : to, 0, moved!);
    patchSlides(next);
  };

  const call = async (input: string, init: RequestInit) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(input, init);
      const data = (await response.json()) as {error?: string};
      if (!response.ok) {
        setError(data.error ?? 'That did not work.');
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError('Could not reach the server.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const savePlaylist = async (publish: boolean) => {
    if (screen === null) {
      return;
    }
    if (serverPlaylist === null) {
      const created = await fetch('/api/playlists', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({screenId: screen.id, name: `${screen.name} rotation`}),
      });
      const data = (await created.json()) as {playlist?: Playlist};
      if (data.playlist === undefined) {
        setError('Could not create the playlist.');
        return;
      }
      await call(`/api/playlists/${data.playlist.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({slides, publish}),
      });
      setDirty(false);
      return;
    }
    const ok = await call(`/api/playlists/${serverPlaylist.id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({slides, publish}),
    });
    if (ok) {
      setDirty(false);
    }
  };

  return (
    <div className="grid grid-cols-[300px_1fr] gap-5">
      <div className="space-y-4">
        <Card flush>
          <div className="px-4 pt-4">
            <CardHeader title="Screens" hint={`${screens.length} registered`} />
          </div>
          <ul className="border-t border-line">
            {screens.map(candidate => {
              const active = candidate.id === selectedId;
              return (
                <li key={candidate.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(candidate.id)}
                    className={`w-full border-b border-line/70 px-4 py-3 text-left transition-colors last:border-0 ${
                      active ? 'bg-brand-tint/60' : 'hover:bg-page'
                    }`}>
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={`size-2 shrink-0 rounded-full ${
                          candidate.online ? 'bg-success' : 'bg-line'
                        }`}
                      />
                      <span className="truncate text-[13.5px] font-bold text-ink">
                        {candidate.name}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate pl-4 text-[12px] text-muted">
                      {candidate.paired
                        ? candidate.online
                          ? 'Online'
                          : `Last seen ${timeAgo(candidate.lastSeen)}`
                        : `Pairing code ${candidate.pairingCode}`}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2 border-t border-line p-3">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1"
              onClick={() => setAddOpen(true)}>
              Add screen
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1"
              onClick={() => setPairOpen(true)}>
              Pair code
            </Button>
          </div>
        </Card>
      </div>

      {screen === null ? (
        <Card>
          <p className="py-16 text-center text-[13.5px] text-muted">
            Add a screen to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[17px] font-extrabold tracking-tight text-ink">
                    {screen.name}
                  </h2>
                  {screen.paired ? (
                    <StatusPill tone={screen.online ? 'success' : 'neutral'} dot>
                      {screen.online ? 'Online' : 'Offline'}
                    </StatusPill>
                  ) : (
                    <StatusPill tone="gold">Not paired</StatusPill>
                  )}
                </div>
                <p className="mt-1 text-[13px] text-muted">
                  {screen.location || 'No location set'} · last seen{' '}
                  {timeAgo(screen.lastSeen)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/screen/${screen.id}`}
                  target="_blank"
                  className="inline-flex h-10 items-center rounded-control border border-brand-edge bg-surface px-4 text-[13.5px] font-semibold text-brand transition-colors hover:bg-brand-tint">
                  Open TV view
                </Link>
                <Button
                  disabled={busy || slides.length === 0}
                  onClick={() => void savePlaylist(true)}>
                  {busy ? 'Pushing…' : 'Push to TV'}
                </Button>
              </div>
            </div>

            {screen.paired ? null : (
              <div className="mt-4 rounded-card border border-gold-edge bg-gold-tint p-4">
                <p className="text-[13px] text-gold-ink">
                  Open{' '}
                  <code className="font-semibold">/screen/{screen.id}</code> on
                  the TV. It shows the code{' '}
                  <strong className="font-extrabold tracking-widest">
                    {screen.pairingCode}
                  </strong>{' '}
                  — enter that under “Pair code” to claim it.
                </p>
              </div>
            )}
          </Card>

          <Card flush>
            <div className="px-5 pt-5">
              <CardHeader
                title="Playlist"
                hint={
                  serverPlaylist === null
                    ? 'No playlist yet. Add slides and push to create one.'
                    : `${slides.filter(slide => slide.enabled).length} of ${slides.length} slides playing · updated ${timeAgo(serverPlaylist.updatedAt)}`
                }
                action={
                  <div className="flex items-center gap-2">
                    {dirty ? (
                      <StatusPill tone="gold">Unsaved</StatusPill>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy || !dirty}
                      onClick={() => void savePlaylist(false)}>
                      Save draft
                    </Button>
                  </div>
                }
              />
            </div>

            <div className="border-t border-line p-5">
              {slides.length === 0 ? (
                <p className="py-10 text-center text-[13.5px] text-muted">
                  No slides yet. Add a poster, an event announcement or a
                  marketing card below.
                </p>
              ) : (
                <ul
                  className="space-y-2.5"
                  onDragOver={dragEvent => dragEvent.preventDefault()}>
                  {slides.map((slide, index) => (
                    <SlideCard
                      key={slide.id}
                      slide={slide}
                      index={index}
                      total={slides.length}
                      event={events.find(item => item.id === slide.eventId)}
                      dragging={draggingIndex === index}
                      onDragStart={() => {
                        dragFrom.current = index;
                        setDraggingIndex(index);
                      }}
                      onDragOver={position => {
                        dragTo.current = position === 'before' ? index : index + 1;
                      }}
                      onDrop={commitDrag}
                      onDragEnd={() => {
                        dragFrom.current = null;
                        dragTo.current = null;
                        setDraggingIndex(null);
                      }}
                      onMove={direction => move(index, direction)}
                      onEdit={() => setEditing({...slide})}
                      onRemove={() =>
                        patchSlides(slides.filter(item => item.id !== slide.id))
                      }
                    />
                  ))}
                </ul>
              )}

              <div className="mt-5 flex gap-2 border-t border-line pt-5">
                {(['poster', 'announcement', 'marketing'] as SlideType[]).map(
                  type => (
                    <Button
                      key={type}
                      size="sm"
                      variant="ghost"
                      disabled={type === 'announcement' && events.length === 0}
                      onClick={() => setEditing(blankSlide(type, events))}>
                      Add {type}
                    </Button>
                  ),
                )}
              </div>
            </div>
          </Card>

          {error === null ? null : (
            <p
              role="alert"
              className="rounded-control border border-coral-edge bg-coral-tint px-3 py-2.5 text-[13px] text-coral-ink">
              {error}
            </p>
          )}
        </div>
      )}

      <SlideEditor
        key={editing?.id ?? 'none'}
        slide={editing}
        events={events}
        onClose={() => setEditing(null)}
        onSave={slide => {
          const exists = slides.some(item => item.id === slide.id);
          patchSlides(
            exists
              ? slides.map(item => (item.id === slide.id ? slide : item))
              : [...slides, slide],
          );
          setEditing(null);
        }}
      />

      <AddScreenDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onDone={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />

      <PairDialog
        open={pairOpen}
        onClose={() => setPairOpen(false)}
        onDone={() => {
          setPairOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function SlideEditor({
  slide,
  events,
  onClose,
  onSave,
}: {
  slide: Slide | null;
  events: SlideEvent[];
  onClose: () => void;
  onSave: (slide: Slide) => void;
}) {
  // Keyed by slide id upstream, so the initial value is always the right one
  // and no effect has to sync the prop into state.
  const [draft, setDraft] = useState<Slide | null>(slide);

  if (draft === null) {
    return null;
  }

  const patch = (changes: Partial<Slide>) =>
    setDraft(current => (current === null ? current : {...current, ...changes}));

  /** datetime-local wants "YYYY-MM-DDTHH:mm", ISO strings carry more. */
  const toLocal = (iso?: string) => (iso === undefined ? '' : iso.slice(0, 16));

  return (
    <Drawer
      open
      onClose={onClose}
      title={`${draft.type[0]!.toUpperCase()}${draft.type.slice(1)} slide`}
      subtitle="Shown full-screen on the TV in playlist order."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)}>Save slide</Button>
        </>
      }>
      <div className="space-y-4">
        {draft.type === 'announcement' ? (
          <Field label="Event">
            <Select
              value={draft.eventId ?? ''}
              onChange={event => patch({eventId: event.target.value})}>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.title} · {event.date}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <ImageUploader
            value={draft.imageUrl}
            onChange={url => patch({imageUrl: url})}
            label={draft.type === 'poster' ? 'Poster image' : 'Background image'}
          />
        )}

        {draft.type === 'marketing' ? (
          <>
            <Field label="Headline">
              <Input
                value={draft.headline ?? ''}
                onChange={event => patch({headline: event.target.value})}
                placeholder="Double stamps today"
              />
            </Field>
            <Field label="Call to action">
              <Input
                value={draft.cta ?? ''}
                onChange={event => patch({cta: event.target.value})}
                placeholder="Every order earns 2× stamps"
              />
            </Field>
          </>
        ) : null}

        <Field label="Duration (seconds)">
          <Input
            type="number"
            min={3}
            max={120}
            value={draft.durationSec}
            onChange={event =>
              patch({durationSec: Math.max(3, Number(event.target.value))})
            }
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts (optional)">
            <Input
              type="datetime-local"
              value={toLocal(draft.startAt)}
              onChange={event =>
                patch({
                  startAt:
                    event.target.value === ''
                      ? undefined
                      : new Date(event.target.value).toISOString(),
                })
              }
            />
          </Field>
          <Field label="Ends (optional)">
            <Input
              type="datetime-local"
              value={toLocal(draft.endAt)}
              onChange={event =>
                patch({
                  endAt:
                    event.target.value === ''
                      ? undefined
                      : new Date(event.target.value).toISOString(),
                })
              }
            />
          </Field>
        </div>

        <label className="flex items-center gap-3 rounded-card border border-line bg-page/60 p-4">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={event => patch({enabled: event.target.checked})}
            className="size-4 accent-[#2B1FC9]"
          />
          <span>
            <span className="block text-[13.5px] font-bold text-ink">
              Enabled
            </span>
            <span className="block text-[12.5px] text-muted">
              Disabled slides stay in the playlist but are skipped.
            </span>
          </span>
        </label>
      </div>
    </Drawer>
  );
}

function AddScreenDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/screens', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, location}),
      });
      const data = (await response.json()) as {error?: string};
      if (!response.ok) {
        setError(data.error ?? 'Could not add the screen.');
        return;
      }
      setName('');
      setLocation('');
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      variant="modal"
      open={open}
      onClose={onClose}
      title="Add a screen"
      subtitle="It gets a pairing code you enter once the TV is showing it."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || name.trim().length === 0}
            onClick={() => void submit()}>
            {busy ? 'Adding…' : 'Add screen'}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Field label="Name">
          <Input
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Cafeteria wall"
          />
        </Field>
        <Field label="Location">
          <Input
            value={location}
            onChange={event => setLocation(event.target.value)}
            placeholder="Ground floor, above the counter"
          />
        </Field>
        {error === null ? null : (
          <p className="text-[13px] text-coral-ink">{error}</p>
        )}
      </div>
    </Drawer>
  );
}

function PairDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/screens/pair', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({code}),
      });
      const data = (await response.json()) as {error?: string};
      if (!response.ok) {
        setError(data.error ?? 'Could not pair.');
        return;
      }
      setCode('');
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      variant="modal"
      open={open}
      onClose={onClose}
      title="Pair a screen"
      subtitle="Type the six digits the TV is showing."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || code.replace(/\D/g, '').length !== 6}
            onClick={() => void submit()}>
            {busy ? 'Pairing…' : 'Pair'}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Field label="Pairing code">
          <Input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={event =>
              setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="000000"
            className="text-center text-2xl font-extrabold tracking-[0.5em]"
          />
        </Field>
        {error === null ? null : (
          <p className="text-[13px] text-coral-ink">{error}</p>
        )}
      </div>
    </Drawer>
  );
}
