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
import type {EventCategory, EventRequest, RequestStatus} from '@/lib/types';

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

export function RequestsView({rows}: {rows: RequestRow[]}) {
  const router = useRouter();
  const [filter, setFilter] = useState<RequestStatus | 'all'>('pending');
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'reject'>('view');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<EventCategory>('Community');
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
    setError(null);
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
            ? {action, category, priceInfo, cafeteriaDiscount: discount}
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
      width: 'w-44',
      render: row => (
        <div>
          <p className="font-semibold">{formatDate(row.date)}</p>
          <p className="text-[12.5px] text-muted">
            {row.startTime}–{row.endTime}
          </p>
        </div>
      ),
    },
    {key: 'room', header: 'Room', width: 'w-40', render: row => row.room},
    {
      key: 'catering',
      header: 'Catering',
      width: 'w-40',
      render: row => (
        <span className="text-muted">{row.catering}</span>
      ),
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
              <span className={active ? 'ml-1.5 opacity-70' : 'ml-1.5 text-dim'}>
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
          onRowClick={row => {
            setOpenId(row.id);
            setMode('view');
            setError(null);
          }}
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
                ['Date', formatDateLong(selected.date)],
                ['Time', `${selected.startTime} – ${selected.endTime}`],
                ['Room', selected.room],
                ['Catering', selected.catering],
                ['Expected people', String(selected.expectedParticipants)],
                ['Submitted', timeAgo(selected.submittedAt)],
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
                  Approving creates a published event from these details.
                  Set how it should appear:
                </p>
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
