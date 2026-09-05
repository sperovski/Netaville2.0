'use client';

import Image from 'next/image';
import {Button} from './Button';
import {StatusPill} from './StatusPill';
import type {Slide} from '@/lib/types';

export type SlideEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  room: string;
};

type Props = {
  slide: Slide;
  index: number;
  total: number;
  event?: SlideEvent;
  onEdit: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  /** Drag-to-reorder wiring from the parent list. */
  dragging: boolean;
  onDragStart: () => void;
  onDragOver: (position: 'before' | 'after') => void;
  onDrop: () => void;
  onDragEnd: () => void;
};

const typeTone = {
  poster: 'cyan',
  announcement: 'brand',
  marketing: 'gold',
} as const;

export function SlideCard({
  slide,
  index,
  total,
  event,
  onEdit,
  onRemove,
  onMove,
  dragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: Props) {
  const scheduled = slide.startAt !== undefined || slide.endAt !== undefined;

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={dragEvent => {
        dragEvent.preventDefault();
        const box = dragEvent.currentTarget.getBoundingClientRect();
        onDragOver(
          dragEvent.clientY < box.top + box.height / 2 ? 'before' : 'after',
        );
      }}
      onDrop={dragEvent => {
        dragEvent.preventDefault();
        onDrop();
      }}
      className={`flex items-center gap-4 rounded-card border bg-surface p-3.5 transition-opacity ${
        dragging ? 'opacity-40' : 'opacity-100'
      } ${slide.enabled ? 'border-line' : 'border-dashed border-line bg-page/50'}`}>
      <span
        className="cursor-grab select-none text-dim active:cursor-grabbing"
        aria-hidden>
        <svg viewBox="0 0 24 24" className="size-4">
          <path
            d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <span className="w-5 shrink-0 text-center text-[12px] font-bold text-dim">
        {index + 1}
      </span>

      <div className="relative grid h-14 w-24 shrink-0 place-items-center overflow-hidden rounded-control border border-line bg-page">
        {slide.imageUrl === undefined ? (
          <span className="px-1 text-center text-[9.5px] font-bold uppercase tracking-wider text-dim">
            {slide.type === 'announcement' ? 'Event' : 'No image'}
          </span>
        ) : (
          <Image
            src={slide.imageUrl}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
            unoptimized
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <StatusPill tone={typeTone[slide.type]}>{slide.type}</StatusPill>
          {slide.enabled ? null : (
            <StatusPill tone="neutral">Disabled</StatusPill>
          )}
          {scheduled ? <StatusPill tone="cyan">Scheduled</StatusPill> : null}
        </div>
        <p className="mt-1.5 truncate text-[13.5px] font-bold text-ink">
          {slide.type === 'announcement'
            ? (event?.title ?? 'Event was deleted')
            : (slide.headline ?? 'Untitled slide')}
        </p>
        <p className="truncate text-[12px] text-muted">
          {slide.durationSec}s
          {slide.type === 'announcement' && event !== undefined
            ? ` · ${event.room}`
            : ''}
          {slide.cta === undefined ? '' : ` · ${slide.cta}`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant="quiet"
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => onMove(-1)}>
          ↑
        </Button>
        <Button
          size="sm"
          variant="quiet"
          aria-label="Move down"
          disabled={index === total - 1}
          onClick={() => onMove(1)}>
          ↓
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="quiet" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </li>
  );
}
