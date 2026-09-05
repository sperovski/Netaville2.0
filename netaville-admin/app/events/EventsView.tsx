'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/Button';
import {Card} from '@/components/Card';
import {DataTable, type Column} from '@/components/DataTable';
import {Drawer} from '@/components/Drawer';
import {Field, Input, Select, Textarea} from '@/components/Field';
import {StatusPill} from '@/components/StatusPill';
import {formatDate, isToday} from '@/lib/format';
import type {EventCategory, NetavilleEvent} from '@/lib/types';

const categories: EventCategory[] = [
  'Workshop',
  'Social',
  'Talk',
  'Quiz',
  'Community',
];

const rooms = [
  'Amphitheatre',
  'Classroom',
  'Cafeteria',
  'Co-working floor',
] as const;

const cateringOptions = ['None', 'Coffee & snacks', 'Full catering'] as const;

function blank(): NetavilleEvent {
  return {
    id: '',
    title: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '18:00',
    endTime: '20:00',
    room: 'Amphitheatre',
    category: 'Community',
    priceInfo: 'Free',
    cafeteriaDiscount: 0,
    catering: 'None',
    published: false,
  };
}

export function EventsView({events}: {events: NetavilleEvent[]}) {
  const router = useRouter();
  const [draft, setDraft] = useState<NetavilleEvent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = draft?.id === '';
  const patch = (changes: Partial<NetavilleEvent>) =>
    setDraft(current => (current === null ? current : {...current, ...changes}));

  const close = () => {
    setDraft(null);
    setConfirmDelete(false);
    setError(null);
  };

  const save = async () => {
    if (draft === null) {
      return;
    }
    if (draft.title.trim().length === 0) {
      setError('An event needs a title.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        isNew ? '/api/events' : `/api/events/${draft.id}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(draft),
        },
      );
      const data = (await response.json()) as {error?: string};
      if (!response.ok) {
        setError(data.error ?? 'Could not save.');
        return;
      }
      close();
      router.refresh();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (draft === null || isNew) {
      return;
    }
    setBusy(true);
    try {
      await fetch(`/api/events/${draft.id}`, {method: 'DELETE'});
      close();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  /** Publish toggle straight from the row, without opening the editor. */
  const togglePublished = async (event: NetavilleEvent) => {
    await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({published: !event.published}),
    });
    router.refresh();
  };

  const columns: Column<NetavilleEvent>[] = [
    {
      key: 'title',
      header: 'Event',
      render: event => (
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{event.title}</p>
          <p className="text-[12.5px] text-muted">
            {event.category} · {event.priceInfo}
            {event.cafeteriaDiscount > 0
              ? ` · ${event.cafeteriaDiscount}% cafeteria`
              : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'when',
      header: 'When',
      width: 'w-44',
      render: event => (
        <div>
          <p className="font-semibold">
            {formatDate(event.date)}
            {isToday(event.date) ? (
              <span className="ml-2 text-[11px] font-bold uppercase tracking-wider text-coral-ink">
                Today
              </span>
            ) : null}
          </p>
          <p className="text-[12.5px] text-muted">
            {event.startTime}–{event.endTime}
          </p>
        </div>
      ),
    },
    {key: 'room', header: 'Room', width: 'w-40', render: event => event.room},
    {
      key: 'catering',
      header: 'Catering',
      width: 'w-40',
      render: event => <span className="text-muted">{event.catering}</span>,
    },
    {
      key: 'published',
      header: 'Status',
      width: 'w-36',
      render: event => (
        <StatusPill tone={event.published ? 'success' : 'neutral'} dot>
          {event.published ? 'Published' : 'Draft'}
        </StatusPill>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-32',
      align: 'right',
      render: event => (
        <Button
          size="sm"
          variant="ghost"
          onClick={clickEvent => {
            clickEvent.stopPropagation();
            void togglePublished(event);
          }}>
          {event.published ? 'Unpublish' : 'Publish'}
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[13px] text-muted">
          {events.filter(event => event.published).length} published ·{' '}
          {events.filter(event => !event.published).length} drafts
        </p>
        <Button onClick={() => setDraft(blank())}>New event</Button>
      </div>

      <Card flush>
        <DataTable
          columns={columns}
          rows={events}
          rowKey={event => event.id}
          onRowClick={event => setDraft({...event})}
          empty="No events yet."
        />
      </Card>

      <Drawer
        open={draft !== null}
        onClose={close}
        title={isNew ? 'New event' : 'Edit event'}
        subtitle={
          isNew
            ? 'It stays a draft until you publish it.'
            : 'Changes reach the students’ feed straight away.'
        }
        footer={
          <>
            {isNew ? null : (
              <Button
                variant="danger"
                disabled={busy}
                className="mr-auto"
                onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            <Button variant="quiet" onClick={close}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </>
        }>
        {draft === null ? null : (
          <div className="space-y-4">
            <Field label="Title">
              <Input
                value={draft.title}
                onChange={event => patch({title: event.target.value})}
                placeholder="e.g. React Native meetup"
              />
            </Field>

            <Field label="Description">
              <Textarea
                rows={3}
                value={draft.description}
                onChange={event => patch({description: event.target.value})}
                placeholder="What students should expect."
              />
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Date">
                <Input
                  type="date"
                  value={draft.date}
                  onChange={event => patch({date: event.target.value})}
                />
              </Field>
              <Field label="Starts">
                <Input
                  type="time"
                  value={draft.startTime}
                  onChange={event => patch({startTime: event.target.value})}
                />
              </Field>
              <Field label="Ends">
                <Input
                  type="time"
                  value={draft.endTime}
                  onChange={event => patch({endTime: event.target.value})}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Room">
                <Select
                  value={draft.room}
                  onChange={event => patch({room: event.target.value})}>
                  {rooms.map(room => (
                    <option key={room}>{room}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Category">
                <Select
                  value={draft.category}
                  onChange={event =>
                    patch({category: event.target.value as EventCategory})
                  }>
                  {categories.map(category => (
                    <option key={category}>{category}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Price info">
                <Input
                  value={draft.priceInfo}
                  onChange={event => patch({priceInfo: event.target.value})}
                  placeholder="Free"
                />
              </Field>
              <Field label="Cafeteria discount (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.cafeteriaDiscount}
                  onChange={event =>
                    patch({cafeteriaDiscount: Number(event.target.value)})
                  }
                />
              </Field>
              <Field label="Catering">
                <Select
                  value={draft.catering}
                  onChange={event => patch({catering: event.target.value})}>
                  {cateringOptions.map(option => (
                    <option key={option}>{option}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <label className="flex items-center gap-3 rounded-card border border-line bg-page/60 p-4">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={event => patch({published: event.target.checked})}
                className="size-4 accent-[#2B1FC9]"
              />
              <span>
                <span className="block text-[13.5px] font-bold text-ink">
                  Published
                </span>
                <span className="block text-[12.5px] text-muted">
                  Visible in the students&apos; event feed.
                </span>
              </span>
            </label>

            {error === null ? null : (
              <p
                role="alert"
                className="rounded-control border border-coral-edge bg-coral-tint px-3 py-2.5 text-[13px] text-coral-ink">
                {error}
              </p>
            )}
          </div>
        )}
      </Drawer>

      <Drawer
        variant="modal"
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this event?"
        subtitle="It disappears from the students' feed and from any TV playlist using it."
        footer={
          <>
            <Button variant="quiet" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => void remove()}>
              {busy ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }>
        <p className="text-[14px] leading-relaxed text-muted">
          <strong className="font-bold text-ink">{draft?.title}</strong> will be
          removed. This cannot be undone.
        </p>
      </Drawer>
    </>
  );
}
