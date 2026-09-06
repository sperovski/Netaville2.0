'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/Button';
import {Card} from '@/components/Card';
import {DataTable, type Column} from '@/components/DataTable';
import {Drawer} from '@/components/Drawer';
import {Field, Input, Select, Textarea} from '@/components/Field';
import {StatusPill, type Tone} from '@/components/StatusPill';
import {formatDate, formatDateLong, timeAgo} from '@/lib/format';
import type {
  EventCategory,
  EventRequest,
  RequestDate,
  RequestStatus,
} from '@/lib/types';

export type RequestRow = EventRequest & {
  requester: string;
  requesterEmail: string;
};

const statusTone: Record<RequestStatus, Tone> = {
  pending: 'gold',
  approved: 'success',
  rejected: 'coral',
};

const filters: {value: RequestStatus | 'all'; label: string}[] = [
  {value: 'pending', label: 'Pending'},
  {value: 'approved', label: 'Approved'},
  {value: 'rejected', label: 'Rejected'},
  {value: 'all', label: 'All'},
];

const categories: EventCategory[] = [
  'Workshop',
  'Social',
  'Talk',
  'Quiz',
  'Community',
];

/**
 * The slot a request is actually about: the one the admin picked once it is
 * approved, and otherwise the organiser's first choice.
 */
function chosenSlot(row: RequestRow): RequestDate | undefined {
  if (row.chosenDateId !== undefined) {
    return row.dates.find(slot => slot.id === row.chosenDateId);
  }
  return row.dates[0];
}

export function RequestsView({rows}: {rows: RequestRow[]}) {
  const router = useRouter();
  const [filter, setFilter] = useState<RequestStatus | 'all'>('pending');
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'reject'>('view');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<EventCategory>('Community');
  /** Which proposed slot the admin picked; null means "the organiser's first". */
  const [chosenDateId, setChosenDateId] = useState<string | null>(null);
  const [priceInfo, setPriceInfo] = useState('Free');
  const [discount, setDiscount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === 'all' ? rows : rows.filter(row => row.status === filter)),
    [rows, filter],
  );
  const selected = rows.find(row => row.id === openId) ?? null;

  const close = () => {
    setOpenId(null);
    setMode('view');
    setReason('');
    setChosenDateId(null);
    setError(null);
  };

  /** Opens a request, defaulting the decision to the organiser's own order. */
  const open = (row: RequestRow) => {
    setOpenId(row.id);
    setMode('view');
    setError(null);
    setCategory(row.category);
    setChosenDateId(row.dates[0]?.id ?? null);
  };

  const decide = async (action: 'approve' | 'reject') => {
    if (selected === null) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/requests/${selected.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(
          action === 'approve'
            ? {
                action,
                category,
                priceInfo,
                cafeteriaDiscount: discount,
                ...(chosenDateId === null ? {} : {chosenDateId}),
              }
            : {action, reason},
        ),
      });
      const data = (await response.json()) as {error?: string};
      if (!response.ok) {
        setError(data.error ?? 'That did not work.');
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

  const columns: Column<RequestRow>[] = [
    {
      key: 'title',
      header: 'Request',
      render: row => (
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{row.title}</p>
          <p className="text-[12.5px] text-muted">
            {row.requester} · {timeAgo(row.submittedAt)}
          </p>
        </div>
      ),
    },
    {
      key: 'when',
      header: 'When',
      width: 'w-52',
      render: row => {
        // Once approved the chosen slot is the only one that matters; before
        // that, the first is the organiser's preference and the count says
        // how much room there is to move.
        const slot = chosenSlot(row);
        const alternatives = row.dates.length - 1;
        return (
          <div>
            <p className="font-semibold">
              {slot === undefined ? '—' : formatDate(slot.date)}
            </p>
            <p className="text-[12.5px] text-muted">
              {slot === undefined
                ? 'No dates offered'
                : `${slot.startTime}–${slot.endTime}`}
              {row.status === 'pending' && alternatives > 0
                ? ` · +${alternatives} more`
                : ''}
            </p>
          </div>
        );
      },
    },
    {key: 'room', header: 'Room', width: 'w-40', render: row => row.room},
    {
      key: 'catering',
      header: 'Catering',
      width: 'w-40',
      render: row => <span className="text-muted">{row.catering}</span>,
    },
    {
      key: 'people',
      header: 'People',
      width: 'w-24',
      align: 'right',
      render: row => (
        <span className="font-semibold">{row.expectedParticipants}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-32',
      render: row => (
        <StatusPill tone={statusTone[row.status]}>{row.status}</StatusPill>
      ),
    },
  ];

  return (
    <>
      <div className="mb-5 flex items-center gap-2">
        {filters.map(option => {
          const active = option.value === filter;
          const count =
            option.value === 'all'
              ? rows.length
              : rows.filter(row => row.status === option.value).length;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                active
                  ? 'border-brand bg-brand text-on-brand'
                  : 'border-line bg-surface text-muted hover:border-brand-edge hover:text-brand'
              }`}>
              {option.label}
              <span
                className={active ? 'ml-1.5 opacity-70' : 'ml-1.5 text-dim'}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card flush>
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={row => row.id}
          onRowClick={open}
          empty={`No ${filter === 'all' ? '' : filter} requests.`}
        />
      </Card>

      <Drawer
        open={selected !== null}
        onClose={close}
        title={selected?.title ?? ''}
        subtitle={
          selected === null
            ? undefined
            : `${selected.requester} · ${selected.requesterEmail}`
        }
        footer={
          selected?.status !== 'pending' ? (
            <Button variant="ghost" onClick={close}>
              Close
            </Button>
          ) : mode === 'reject' ? (
            <>
              <Button variant="quiet" onClick={() => setMode('view')}>
                Back
              </Button>
              <Button
                variant="danger"
                disabled={busy || reason.trim().length === 0}
                onClick={() => void decide('reject')}>
                {busy ? 'Rejecting…' : 'Confirm rejection'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="danger" onClick={() => setMode('reject')}>
                Reject
              </Button>
              <Button disabled={busy} onClick={() => void decide('approve')}>
                {busy ? 'Approving…' : 'Approve and publish'}
              </Button>
            </>
          )
        }>
        {selected === null ? null : (
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-card border border-line bg-page/60 p-4">
              {[
                ['Type', selected.category],
                ['Room', selected.room],
                ['Catering', selected.catering],
                ['Expected people', String(selected.expectedParticipants)],
                ['Submitted', timeAgo(selected.submittedAt)],
                [
                  selected.status === 'approved'
                    ? 'Running on'
                    : 'First choice',
                  chosenSlot(selected) === undefined
                    ? '—'
                    : `${formatDateLong(chosenSlot(selected)!.date)}, ${chosenSlot(selected)!.startTime}–${chosenSlot(selected)!.endTime}`,
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-dim">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-[14px] font-semibold text-ink">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {selected.description.trim().length === 0 ? null : (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-dim">
                  What they want to run
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                  {selected.description}
                </p>
              </div>
            )}

            {selected.dietary.length === 0 &&
            selected.foodNotes.trim().length === 0 ? null : (
              <div className="rounded-card border border-gold-edge bg-gold-tint p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gold-ink">
                  Food requirements
                </p>
                {selected.dietary.length === 0 ? null : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.dietary.map(item => (
                      <span
                        key={item}
                        className="rounded-control border border-gold-edge bg-surface px-2 py-1 text-[12px] font-semibold text-gold-ink">
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                {selected.foodNotes.trim().length === 0 ? null : (
                  <p className="mt-2 text-[13px] text-gold-ink">
                    {selected.foodNotes}
                  </p>
                )}
              </div>
            )}

            {selected.status === 'rejected' && selected.reason !== undefined ? (
              <div className="rounded-card border border-coral-edge bg-coral-tint p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-coral-ink">
                  Rejection reason
                </p>
                <p className="mt-1 text-[13.5px] text-coral-ink">
                  {selected.reason}
                </p>
              </div>
            ) : null}

            {selected.status === 'approved' ? (
              <div className="rounded-card border border-success-edge bg-success-tint p-4 text-[13.5px] text-success">
                Approved. The event is published in the students&apos; feed.
              </div>
            ) : null}

            {selected.status === 'pending' && mode === 'view' ? (
              <div className="space-y-4">
                <p className="text-[13px] leading-relaxed text-muted">
                  Approving creates a published event from these details. Pick
                  the date it runs on and set how it should appear:
                </p>

                {/* The organiser offered these in preference order; the room
                    is usually what decides between them. */}
                <Field
                  label={
                    selected.dates.length === 1
                      ? 'Requested date'
                      : `Date — ${selected.dates.length} offered, in their order of preference`
                  }>
                  <div className="space-y-2">
                    {selected.dates.map((slot, position) => {
                      const picked =
                        (chosenDateId ?? selected.dates[0]?.id) === slot.id;
                      return (
                        <label
                          key={slot.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-card border px-3.5 py-3 transition-colors ${
                            picked
                              ? 'border-brand bg-brand-tint'
                              : 'border-line bg-surface hover:border-brand-edge'
                          }`}>
                          <input
                            type="radio"
                            name="chosen-date"
                            className="accent-brand"
                            checked={picked}
                            onChange={() => setChosenDateId(slot.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13.5px] font-bold text-ink">
                              {formatDateLong(slot.date)}
                            </span>
                            <span className="block text-[12.5px] text-muted">
                              {slot.startTime}–{slot.endTime}
                              {position === 0 ? ' · their first choice' : ''}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Category">
                    <Select
                      value={category}
                      onChange={event =>
                        setCategory(event.target.value as EventCategory)
                      }>
                      {categories.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Price info">
                    <Input
                      value={priceInfo}
                      onChange={event => setPriceInfo(event.target.value)}
                      placeholder="Free"
                    />
                  </Field>
                </div>
                <Field label="Cafeteria discount (%)">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={discount}
                    onChange={event => setDiscount(Number(event.target.value))}
                  />
                </Field>
              </div>
            ) : null}

            {selected.status === 'pending' && mode === 'reject' ? (
              <Field label="Reason for rejection">
                <Textarea
                  rows={4}
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  placeholder="The student sees this, so be specific."
                />
              </Field>
            ) : null}

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
    </>
  );
}
