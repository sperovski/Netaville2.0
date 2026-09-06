'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import jsQR from 'jsqr';
import {Button} from '@/components/Button';
import {Card, CardHeader} from '@/components/Card';
import {Field, Input, Select} from '@/components/Field';
import {StatusPill} from '@/components/StatusPill';
import {timeAgo} from '@/lib/format';
import {STAMPS_PER_REWARD, type CounterView as View} from '@/lib/types';

type Student = {id: string; name: string; email: string};

type Props = {
  students: Student[];
  today: {stamps: number; redeemed: number};
};

type Action = 'resolve' | 'add' | 'remove' | 'redeem';

/** How often a frame is read for a code. Fast enough to feel instant. */
const SCAN_INTERVAL_MS = 220;

/**
 * The same code will sit in front of the camera for several seconds after it
 * is read. Without this the till would stamp the card on every frame.
 */
const REPEAT_LOCKOUT_MS = 4000;

export function CounterView({students, today}: Props) {
  const [view, setView] = useState<View | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState('');
  const [pasted, setPasted] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCode = useRef<{value: string; at: number} | null>(null);

  const send = useCallback(
    async (action: Action, payload: {code?: string; userId?: string}) => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch('/api/stamps', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({action, ...payload}),
        });
        const data = (await response.json()) as View & {
          error?: string;
          earnedReward?: boolean;
        };
        if (!response.ok) {
          setError(data.error ?? 'That did not work.');
          return;
        }
        setView(data);
        if (action === 'add') {
          setFlash(
            data.earnedReward === true
              ? `Card full — ${data.student.name} has a free coffee`
              : `Stamp added for ${data.student.name}`,
          );
        } else if (action === 'redeem') {
          setFlash(`Free coffee handed to ${data.student.name}`);
        } else if (action === 'remove') {
          setFlash(`Stamp removed from ${data.student.name}`);
        } else {
          setFlash(null);
        }
      } catch {
        setError('Could not reach the server.');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  // Reading frames: the video element is drawn into an offscreen canvas and
  // the pixels handed to jsQR. Nothing leaves the browser.
  useEffect(() => {
    if (!scanning) {
      return;
    }
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {facingMode: 'environment'},
        });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current !== null) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setError(
          'No camera available. Use “Find a student” below to stamp by hand.',
        );
        setScanning(false);
      }
    };

    void start();

    const timer = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video === null || canvas === null || video.readyState < 2) {
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d', {willReadFrequently: true});
      if (context === null) {
        return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const found = jsQR(frame.data, frame.width, frame.height);
      if (found === null) {
        return;
      }

      const now = Date.now();
      const previous = lastCode.current;
      if (
        previous !== null &&
        previous.value === found.data &&
        now - previous.at < REPEAT_LOCKOUT_MS
      ) {
        return;
      }
      lastCode.current = {value: found.data, at: now};
      // A scan adds a stamp outright: that is what the person at the till is
      // there to do, and making them press a second button doubles every
      // transaction. Everything else is one press away below.
      void send('add', {code: found.data});
    }, SCAN_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, [scanning, send]);

  // The banner is a receipt, not a state — it should fade rather than sit.
  useEffect(() => {
    if (flash === null) {
      return;
    }
    const timer = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(timer);
  }, [flash]);

  const card = view?.card;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-5">
      <div className="space-y-5">
        <Card>
          <CardHeader
            title="Scan a card"
            hint="Point the camera at the QR code on the student's Card screen."
            action={
              <Button
                variant={scanning ? 'danger' : 'primary'}
                size="sm"
                onClick={() => setScanning(current => !current)}>
                {scanning ? 'Stop camera' : 'Start camera'}
              </Button>
            }
          />

          <div className="mt-4 overflow-hidden rounded-card border border-line bg-[#0b0a1f]">
            {scanning ? (
              <video
                ref={videoRef}
                muted
                playsInline
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="grid aspect-video w-full place-items-center px-6 text-center">
                <p className="text-[14px] text-white/55">
                  The camera is off. Start it to scan, or find a student by name
                  below.
                </p>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <Field label="Or paste a scanned code">
              <Input
                value={pasted}
                onChange={event => setPasted(event.target.value)}
                placeholder="netaville://stamp?v=1&u=…"
              />
            </Field>
            <Button
              variant="ghost"
              disabled={busy || pasted.trim().length === 0}
              onClick={() => void send('resolve', {code: pasted.trim()})}>
              Look up
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Find a student"
            hint="For a card left at home, or to fix a mis-scan."
          />
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <Field label="Student">
              <Select
                value={manualId}
                onChange={event => setManualId(event.target.value)}>
                <option value="">Pick a student…</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} · {student.email}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              variant="ghost"
              disabled={busy || manualId === ''}
              onClick={() => void send('resolve', {userId: manualId})}>
              Open card
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader title="Today" hint="Across the counter." />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Stamps given" value={today.stamps} />
            <Stat label="Coffees handed over" value={today.redeemed} />
          </div>
        </Card>

        {flash === null ? null : (
          <p
            role="status"
            className="rounded-card border border-success-edge bg-success-tint px-4 py-3 text-[13.5px] font-semibold text-success">
            {flash}
          </p>
        )}

        {error === null ? null : (
          <p
            role="alert"
            className="rounded-card border border-coral-edge bg-coral-tint px-4 py-3 text-[13.5px] text-coral-ink">
            {error}
          </p>
        )}

        {view === null || card === undefined ? (
          <Card>
            <p className="py-12 text-center text-[13.5px] text-muted">
              Nothing scanned yet.
            </p>
          </Card>
        ) : (
          <>
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-[17px] font-extrabold tracking-tight text-ink">
                    {view.student.name}
                  </h2>
                  <p className="truncate text-[12.5px] text-muted">
                    {view.student.email}
                  </p>
                </div>
                {view.student.active ? null : (
                  <StatusPill tone="coral">Deactivated</StatusPill>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-[38px] font-extrabold leading-none tracking-tight text-ink">
                  {card.stamps}
                </span>
                <span className="text-[20px] font-bold text-dim">
                  /{STAMPS_PER_REWARD}
                </span>
                <span className="ml-auto text-[13px] font-semibold text-muted">
                  {card.rewards} free{' '}
                  {card.rewards === 1 ? 'coffee' : 'coffees'} banked
                </span>
              </div>

              {/* The card itself, so staff and student see the same thing. */}
              <div className="mt-3 flex gap-1.5">
                {Array.from({length: STAMPS_PER_REWARD}, (_, slot) => (
                  <span
                    key={slot}
                    className={`h-2.5 flex-1 rounded-full ${
                      slot < card.stamps ? 'bg-brand' : 'bg-line'
                    }`}
                  />
                ))}
              </div>

              <p className="mt-3 text-[12.5px] text-muted">
                {card.lifetimeStamps} lifetime · {card.coffeesRedeemed} redeemed
                · updated {timeAgo(card.updatedAt)}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button
                  disabled={busy || !view.student.active}
                  onClick={() => void send('add', {userId: view.student.id})}>
                  Add stamp
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy || card.rewards === 0}
                  onClick={() =>
                    void send('redeem', {userId: view.student.id})
                  }>
                  Hand over coffee
                </Button>
                <Button
                  variant="quiet"
                  className="col-span-2"
                  disabled={busy || (card.stamps === 0 && card.rewards === 0)}
                  onClick={() =>
                    void send('remove', {userId: view.student.id})
                  }>
                  Undo a stamp
                </Button>
              </div>
            </Card>

            <Card flush>
              <div className="px-5 pt-5">
                <CardHeader title="History" hint="Newest first." />
              </div>
              <ul className="mt-3 divide-y divide-line/70 border-t border-line">
                {view.history.map(entry => (
                  <li key={entry.id} className="flex gap-3 px-5 py-2.5">
                    <span className="pt-0.5">
                      <StatusPill
                        tone={
                          entry.kind === 'stamp'
                            ? 'success'
                            : entry.kind === 'unstamp'
                              ? 'coral'
                              : entry.kind === 'reward'
                                ? 'gold'
                                : 'brand'
                        }>
                        {entry.kind}
                      </StatusPill>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] text-ink">
                        {entry.note === ''
                          ? entry.kind === 'stamp'
                            ? 'Stamp added'
                            : 'Stamp removed'
                          : entry.note}
                      </p>
                      <p className="text-[11.5px] text-dim">
                        {timeAgo(entry.at)}
                        {entry.actor === null ? '' : ` · ${entry.actor}`}
                      </p>
                    </div>
                  </li>
                ))}
                {view.history.length === 0 ? (
                  <li className="px-5 py-8 text-center text-[13px] text-muted">
                    Nothing on this card yet.
                  </li>
                ) : null}
              </ul>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({label, value}: {label: string; value: number}) {
  return (
    <div className="rounded-card border border-line bg-page/60 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-dim">
        {label}
      </p>
      <p className="mt-1 text-[24px] font-extrabold leading-none text-ink">
        {value}
      </p>
    </div>
  );
}
