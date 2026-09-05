'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/Button';
import {Card} from '@/components/Card';
import {DataTable, type Column} from '@/components/DataTable';
import {Drawer} from '@/components/Drawer';
import {Input} from '@/components/Field';
import {StatusPill} from '@/components/StatusPill';
import {formatDate, timeAgo} from '@/lib/format';
import type {User} from '@/lib/types';

export function StudentsView({students}: {students: User[]}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) {
      return students;
    }
    return students.filter(
      student =>
        student.name.toLowerCase().includes(needle) ||
        student.email.toLowerCase().includes(needle),
    );
  }, [students, query]);

  const online = students.filter(student => student.online && student.active);

  const setActive = async (student: User, active: boolean) => {
    setBusy(true);
    try {
      await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({active}),
      });
      setTarget(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Student',
      render: student => (
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className={`size-2 shrink-0 rounded-full ${
              student.online && student.active ? 'bg-success' : 'bg-line'
            }`}
          />
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{student.name}</p>
            <p className="truncate text-[12.5px] text-muted">{student.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'presence',
      header: 'Presence',
      width: 'w-40',
      render: student =>
        student.online && student.active ? (
          <StatusPill tone="success" dot>
            Online
          </StatusPill>
        ) : (
          <span className="text-[12.5px] text-muted">
            {timeAgo(student.lastSeen)}
          </span>
        ),
    },
    {
      key: 'joined',
      header: 'Joined',
      width: 'w-36',
      render: student => (
        <span className="text-muted">{formatDate(student.joinedAt)}</span>
      ),
    },
    {
      key: 'attended',
      header: 'Attended',
      width: 'w-28',
      align: 'right',
      render: student => (
        <span className="font-semibold">{student.eventsAttended}</span>
      ),
    },
    {
      key: 'rsvps',
      header: 'RSVPs',
      width: 'w-24',
      align: 'right',
      render: student => (
        <span className="font-semibold">{student.rsvps}</span>
      ),
    },
    {
      key: 'status',
      header: 'Account',
      width: 'w-32',
      render: student =>
        student.active ? (
          <StatusPill tone="neutral">Active</StatusPill>
        ) : (
          <StatusPill tone="coral">Deactivated</StatusPill>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-36',
      align: 'right',
      render: student => (
        <Button
          size="sm"
          variant={student.active ? 'danger' : 'ghost'}
          onClick={() => {
            if (student.active) {
              setTarget(student);
            } else {
              void setActive(student, true);
            }
          }}>
          {student.active ? 'Deactivate' : 'Reactivate'}
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-6">
        <div className="w-80">
          <Input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search by name or email"
          />
        </div>
        <p className="text-[13px] text-muted">
          <span className="font-bold text-success">{online.length} online</span>{' '}
          of {students.length} registered
        </p>
      </div>

      <Card flush>
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={student => student.id}
          empty="No student matches that search."
        />
      </Card>

      <Drawer
        variant="modal"
        open={target !== null}
        onClose={() => setTarget(null)}
        title="Deactivate this student?"
        subtitle="They are signed out of the mobile app and cannot sign back in."
        footer={
          <>
            <Button variant="quiet" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (target !== null) {
                  void setActive(target, false);
                }
              }}>
              {busy ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </>
        }>
        <p className="text-[14px] leading-relaxed text-muted">
          <strong className="font-bold text-ink">{target?.name}</strong> keeps
          their stamps and history. You can reactivate them at any time.
        </p>
      </Drawer>
    </>
  );
}
