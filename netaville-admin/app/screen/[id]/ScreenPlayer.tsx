'use client';

import {useCallback, useEffect, useState} from 'react';
import type {ResolvedSlide, ScreenFeed} from '@/lib/types';

/** How often the TV asks the API whether the playlist changed. */
const POLL_MS = 10_000;

function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

type Props = {
  screenId: string;
  initialFeed: ScreenFeed;
};

export function ScreenPlayer({screenId, initialFeed}: Props) {
  const [feed, setFeed] = useState(initialFeed);
  const [stalled, setStalled] = useState(false);
  const [step, setStep] = useState(0);
  const [clock, setClock] = useState('');

  const slides = feed.playlist?.slides ?? [];
  // Derived, not stored: a shortened playlist can never leave us out of range.
  const index = slides.length === 0 ? 0 : step % slides.length;
  const current: ResolvedSlide | undefined = slides[index];

  const poll = useCallback(async () => {
    try {
      const response = await fetch(`/api/screens/${screenId}/feed`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        setStalled(true);
        return;
      }
      const data = (await response.json()) as ScreenFeed;
      setStalled(false);
      setFeed(previous => {
        // Restart the rotation only when the playlist actually changed, so a
        // routine poll never interrupts the slide on the wall.
        if (previous.playlist?.updatedAt !== data.playlist?.updatedAt) {
          setStep(0);
        }
        return data;
      });
    } catch {
      setStalled(true);
    }
  }, [screenId]);

  useEffect(() => {
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  // The corner clock, so a quiet screen still looks alive.
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    const timer = setInterval(tick, 15_000);
    tick();
    return () => clearInterval(timer);
  }, []);

  // Hold each slide for its own duration, then advance. The fade itself is a
  // CSS animation keyed to the slide, so no state drives the transition.
  const holdMs = (current?.durationSec ?? 10) * 1000;
  useEffect(() => {
    if (slides.length < 2) {
      return;
    }
    const timer = setTimeout(() => setStep(previous => previous + 1), holdMs);
    return () => clearTimeout(timer);
  }, [step, holdMs, slides.length]);

  if (!feed.screen.paired) {
    return (
      <Stage>
        <div className="text-center">
          <p className="text-[26px] font-semibold uppercase tracking-[0.35em] text-white/45">
            Netaville
          </p>
          <p className="mt-10 text-[30px] font-medium text-white/70">
            Enter this code in the admin panel
          </p>
          <p className="mt-8 font-mono text-[150px] font-extrabold leading-none tracking-[0.12em] text-white tabular-nums">
            {feed.screen.pairingCode}
          </p>
          <p className="mt-10 text-[24px] text-white/45">{feed.screen.name}</p>
        </div>
      </Stage>
    );
  }

  if (current === undefined) {
    return (
      <Stage>
        <div className="text-center">
          <p className="text-[26px] font-semibold uppercase tracking-[0.35em] text-white/45">
            Netaville
          </p>
          <p className="mt-8 text-[34px] font-medium text-white/70">
            Nothing scheduled on this screen
          </p>
        </div>
        <Clock value={clock} />
      </Stage>
    );
  }

  return (
    <Stage>
      <div
        key={`${current.id}-${step}`}
        style={{animationDuration: `${current.durationSec}s`}}
        className="screen-slide absolute inset-0">
        <Slide slide={current} />
      </div>

      <Progress count={slides.length} index={index} stalled={stalled} />
      <Clock value={clock} />
    </Stage>
  );
}

function Stage({children}: {children: React.ReactNode}) {
  return (
    <div className="screen-stage relative h-screen w-screen overflow-hidden bg-[#0b0a1f] text-white">
      <div className="grid h-full w-full place-items-center">{children}</div>
    </div>
  );
}

function Clock({value}: {value: string}) {
  return (
    <p className="absolute bottom-10 right-14 z-10 text-[28px] font-bold tabular-nums text-white/40">
      {value}
    </p>
  );
}

function Progress({
  count,
  index,
  stalled,
}: {
  count: number;
  index: number;
  stalled: boolean;
}) {
  return (
    <div className="absolute bottom-10 left-14 z-10 flex items-center gap-2.5">
      {Array.from({length: count}, (_, position) => (
        <span
          key={position}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            position === index ? 'w-10 bg-white/80' : 'w-4 bg-white/25'
          }`}
        />
      ))}
      {stalled ? (
        <span className="ml-3 text-[15px] font-semibold text-[#F5B301]">
          Offline
        </span>
      ) : null}
    </div>
  );
}

function Slide({slide}: {slide: ResolvedSlide}) {
  if (slide.type === 'poster') {
    return slide.imageUrl === undefined ? (
      <Fallback label="Poster" />
    ) : (
      // A poster is artwork someone designed; show all of it, never crop.
      <div
        className="h-full w-full bg-contain bg-center bg-no-repeat"
        style={{backgroundImage: `url(${slide.imageUrl})`}}
      />
    );
  }

  if (slide.type === 'marketing') {
    return (
      <div className="relative h-full w-full">
        {slide.imageUrl === undefined ? (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2B1FC9] via-[#241F6B] to-[#0b0a1f]" />
        ) : (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{backgroundImage: `url(${slide.imageUrl})`}}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          </>
        )}
        <div className="absolute inset-0 flex flex-col justify-end p-24">
          {slide.headline === undefined || slide.headline === '' ? null : (
            <h1 className="max-w-[80%] text-[110px] font-extrabold leading-[0.95] tracking-tight">
              {slide.headline}
            </h1>
          )}
          {slide.cta === undefined || slide.cta === '' ? null : (
            <p className="mt-8 text-[46px] font-semibold text-[#F5B301]">
              {slide.cta}
            </p>
          )}
        </div>
      </div>
    );
  }

  const event = slide.event;
  if (event === undefined) {
    return <Fallback label="Event announcement" />;
  }

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-[#2B1FC9] via-[#241F6B] to-[#0b0a1f]">
      {/* the logo's ray geometry, bled off the corner like the mobile app */}
      <svg
        viewBox="0 0 100 100"
        className="absolute -right-20 -top-24 w-[46vw] opacity-[0.14]"
        aria-hidden>
        {Array.from({length: 7}, (_, ray) => (
          <path
            key={ray}
            d="M50 50 L100 20 L100 34 Z"
            fill="#F5B301"
            transform={`rotate(${ray * 13} 50 50)`}
          />
        ))}
      </svg>

      <div className="relative flex h-full flex-col justify-center px-28">
        <p className="text-[30px] font-bold uppercase tracking-[0.3em] text-[#F5B301]">
          {event.category}
        </p>
        <h1 className="mt-8 max-w-[85%] text-[124px] font-extrabold leading-[0.92] tracking-tight">
          {event.title}
        </h1>
        <div className="mt-14 flex items-center gap-14 text-[44px] font-semibold text-white/85">
          <span>{formatLongDate(event.date)}</span>
          <span className="text-white/30">·</span>
          <span>
            {event.startTime}–{event.endTime}
          </span>
          <span className="text-white/30">·</span>
          <span>{event.room}</span>
        </div>
      </div>
    </div>
  );
}

function Fallback({label}: {label: string}) {
  return (
    <div className="grid h-full w-full place-items-center">
      <p className="text-[34px] font-medium text-white/40">{label}</p>
    </div>
  );
}
