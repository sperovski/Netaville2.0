'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type {
  BoardEvent,
  ResolvedSlide,
  ScreenFeed,
  ScreenTheme,
} from '@/lib/types';

/** How often the TV asks the API whether the playlist changed. */
const POLL_MS = 10_000;

/**
 * When 'auto' switches over. A wall in daylight needs the light theme to stay
 * readable through the glare; after dark the light one is the only thing in
 * the room and it glares back. Swapping also means no single static layout
 * sits on the same pixels for twenty-four hours, which is what burns a panel.
 */
const LIGHT_FROM = 7;
const LIGHT_UNTIL = 19;

function isDaytime(): boolean {
  const hour = new Date().getHours();
  return hour >= LIGHT_FROM && hour < LIGHT_UNTIL;
}

/**
 * Resolves 'auto' against the clock, and keeps resolving it while it runs.
 *
 * The clock read is deferred to a mount effect rather than the initial render:
 * the server and the panel can sit either side of the 7am/7pm boundary, and a
 * theme that differs between the two is a hydration mismatch that throws the
 * whole tree away on load. The wall shows dark for one frame, then settles.
 */
function useResolvedTheme(theme: ScreenTheme): 'light' | 'dark' {
  const [daytime, setDaytime] = useState<boolean | null>(null);

  useEffect(() => {
    if (theme !== 'auto') {
      return;
    }
    const sync = () => setDaytime(isDaytime());
    sync();
    // A screen runs for months; checking every minute is what makes the
    // switchover happen on its own rather than at the next redeploy.
    const timer = setInterval(sync, 60_000);
    return () => clearInterval(timer);
  }, [theme]);

  if (theme === 'light') {
    return 'light';
  }
  if (theme === 'dark') {
    return 'dark';
  }
  // null until the mount effect has read the clock — dark is the safe first paint.
  return daytime ? 'light' : 'dark';
}

/** The two palettes. Everything on the wall reads its colours from here. */
type Tone = {
  dark: boolean;
  stage: string;
  ink: string;
  muted: string;
  faint: string;
  rule: string;
  accent: string;
  panel: string;
};

const TONES: Record<'light' | 'dark', Tone> = {
  dark: {
    dark: true,
    stage: 'bg-[#0b0a1f] text-white',
    ink: 'text-white',
    muted: 'text-white/70',
    faint: 'text-white/40',
    rule: 'border-white/15',
    accent: 'text-[#F5B301]',
    panel: 'bg-white/[0.055]',
  },
  light: {
    dark: false,
    stage: 'bg-[#FBF8F1] text-[#241F6B]',
    ink: 'text-[#241F6B]',
    muted: 'text-[#4A427F]',
    faint: 'text-[#8C8499]',
    rule: 'border-[#241F6B]/12',
    accent: 'text-[#B8590B]',
    panel: 'bg-white',
  },
};

function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function weekday(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
  });
}

function dayNumber(iso: string): string {
  return String(new Date(`${iso}T00:00:00`).getDate());
}

function month(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    month: 'short',
  });
}

type Props = {
  screenId: string;
  initialFeed: ScreenFeed;
  /**
   * Where to poll. Defaults to the by-id endpoint for the admin's /screen/[id]
   * preview; the real /tv route passes the token-authenticated one.
   */
  feedUrl?: string;
  /** Extra headers for the poll — the device bearer token, on /tv. */
  feedHeaders?: Record<string, string>;
  /** localStorage key to cache the last good feed under, for offline boots. */
  cacheKey?: string;
};

export function ScreenPlayer({
  screenId,
  initialFeed,
  feedUrl,
  feedHeaders,
  cacheKey,
}: Props) {
  const [feed, setFeed] = useState(initialFeed);
  const [stalled, setStalled] = useState(false);
  const [step, setStep] = useState(0);
  const [clock, setClock] = useState('');
  // The wall is a client surface — the clock, the theme switch, the rotation
  // all move with time and the device's locale, none of which the server
  // shares. Rather than chase every one, the first paint is the bare dark
  // stage on both sides (so hydration always matches) and everything real
  // mounts a frame later. On a TV that boots for minutes, one dark frame is
  // nothing.
  const ready = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  const tone = TONES[useResolvedTheme(feed.screen.theme)];
  const slides = feed.playlist?.slides ?? [];
  // Derived, not stored: a shortened playlist can never leave us out of range.
  const index = slides.length === 0 ? 0 : step % slides.length;
  const current: ResolvedSlide | undefined = slides[index];

  const endpoint = feedUrl ?? `/api/screens/${screenId}/feed`;
  // Backs off after a failure so a panel with no uplink is not hammering a
  // dead endpoint every ten seconds for hours.
  const misses = useRef(0);

  const poll = useCallback(async () => {
    try {
      const response = await fetch(endpoint, {
        cache: 'no-store',
        headers: feedHeaders,
      });
      if (!response.ok) {
        misses.current += 1;
        setStalled(true);
        return;
      }
      const data = (await response.json()) as ScreenFeed;
      misses.current = 0;
      setStalled(false);
      if (cacheKey !== undefined) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {
          // Storage full or blocked; the in-memory feed still stands.
        }
      }
      setFeed(previous => {
        // Restart the rotation only when the playlist actually changed, so a
        // routine poll never interrupts the slide on the wall.
        if (previous.playlist?.updatedAt !== data.playlist?.updatedAt) {
          setStep(0);
        }
        return data;
      });
    } catch {
      misses.current += 1;
      setStalled(true);
    }
  }, [endpoint, feedHeaders, cacheKey]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      if (cancelled) {
        return;
      }
      await poll();
      // 10s while healthy; widening toward a 2-minute ceiling while it keeps
      // failing, so a reconnect is noticed soon but a long outage stays quiet.
      const delay = Math.min(
        POLL_MS * 2 ** Math.min(misses.current, 4),
        120_000,
      );
      timer = setTimeout(() => void loop(), delay);
    };
    void loop();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [poll]);

  // Keep the panel awake. A TV browser dims and then sleeps the display on its
  // own; a signage screen must not. Re-requested whenever the tab becomes
  // visible again, because the lock is dropped on hide.
  useEffect(() => {
    let lock: {release: () => Promise<void>} | null = null;
    const request = async () => {
      try {
        const withLock = navigator as Navigator & {
          wakeLock?: {request: (type: 'screen') => Promise<typeof lock>};
        };
        if (
          withLock.wakeLock !== undefined &&
          document.visibilityState === 'visible'
        ) {
          lock = await withLock.wakeLock.request('screen');
        }
      } catch {
        // Not supported, or denied while backgrounded. Nothing else to try.
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void request();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

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

  // First paint on both server and client: the bare stage, nothing time-bound.
  if (!ready) {
    return <Stage tone={TONES.dark} />;
  }

  if (!feed.screen.paired) {
    return (
      <Stage tone={tone}>
        <div className="text-center">
          <p
            className={`text-[26px] font-semibold uppercase tracking-[0.35em] ${tone.faint}`}>
            Netaville
          </p>
          <p className={`mt-10 text-[30px] font-medium ${tone.muted}`}>
            Enter this code in the admin panel
          </p>
          <p
            className={`mt-8 font-mono text-[150px] font-extrabold leading-none tracking-[0.12em] tabular-nums ${tone.ink}`}>
            {feed.screen.pairingCode}
          </p>
          <p className={`mt-10 text-[24px] ${tone.faint}`}>
            {feed.screen.name}
          </p>
        </div>
      </Stage>
    );
  }

  if (current === undefined) {
    return (
      <Stage tone={tone}>
        <div className="text-center">
          <p
            className={`text-[26px] font-semibold uppercase tracking-[0.35em] ${tone.faint}`}>
            Netaville
          </p>
          <p className={`mt-8 text-[34px] font-medium ${tone.muted}`}>
            Nothing scheduled on this screen
          </p>
        </div>
        <Clock value={clock} tone={tone} />
      </Stage>
    );
  }

  return (
    <Stage tone={tone}>
      <div
        key={`${current.id}-${step}`}
        style={{animationDuration: `${current.durationSec}s`}}
        className="screen-slide absolute inset-0">
        <Slide slide={current} tone={tone} today={feed.today} />
      </div>

      <Progress
        count={slides.length}
        index={index}
        stalled={stalled}
        tone={tone}
      />
      <Clock value={clock} tone={tone} />
    </Stage>
  );
}

/** Nothing to subscribe to: "are we on the client yet" flips once and stays. */
function subscribeNever(): () => void {
  return () => {};
}

function Stage({tone, children}: {tone: Tone; children?: React.ReactNode}) {
  return (
    <div
      className={`screen-stage relative h-screen w-screen overflow-hidden transition-colors duration-1000 ${tone.stage}`}>
      <div className="grid h-full w-full place-items-center">{children}</div>
    </div>
  );
}

function Clock({value, tone}: {value: string; tone: Tone}) {
  return (
    <p
      className={`absolute bottom-10 right-14 z-10 text-[28px] font-bold tabular-nums ${tone.faint}`}>
      {value}
    </p>
  );
}

function Progress({
  count,
  index,
  stalled,
  tone,
}: {
  count: number;
  index: number;
  stalled: boolean;
  tone: Tone;
}) {
  const on = tone.dark ? 'bg-white/80' : 'bg-[#241F6B]/70';
  const off = tone.dark ? 'bg-white/25' : 'bg-[#241F6B]/20';
  return (
    <div className="absolute bottom-10 left-14 z-10 flex items-center gap-2.5">
      {Array.from({length: count}, (_, position) => (
        <span
          key={position}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            position === index ? `w-10 ${on}` : `w-4 ${off}`
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

function Slide({
  slide,
  tone,
  today,
}: {
  slide: ResolvedSlide;
  tone: Tone;
  today: string;
}) {
  if (slide.type === 'upcoming') {
    return <Board slide={slide} tone={tone} today={today} />;
  }

  if (slide.type === 'poster') {
    if (slide.videoUrl !== undefined) {
      // A poster cut as a loop — silent, fitted whole, never cropped.
      return (
        <video
          src={slide.videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-contain"
        />
      );
    }
    return slide.imageUrl === undefined ? (
      <Fallback label="Poster" tone={tone} />
    ) : (
      // A poster is artwork someone designed; show all of it, never crop.
      <div
        className="h-full w-full bg-contain bg-center bg-no-repeat"
        style={{backgroundImage: `url(${slide.imageUrl})`}}
      />
    );
  }

  if (slide.type === 'marketing') {
    return <Commercial slide={slide} tone={tone} />;
  }

  const event = slide.event;
  if (event === undefined) {
    return <Fallback label="Event announcement" tone={tone} />;
  }

  return <Announcement event={event} tone={tone} />;
}

/**
 * The events board.
 *
 * The reason a wall is worth having: it is always current, because it draws
 * the feed rather than artwork someone cut last month. Commercials sit between
 * boards in the rotation, so the room sees what's on, then an advert, then
 * what's on again.
 */
function Board({
  slide,
  tone,
  today,
}: {
  slide: ResolvedSlide;
  tone: Tone;
  today: string;
}) {
  const events = slide.events ?? [];
  const headline =
    slide.headline === undefined || slide.headline === ''
      ? "What's on"
      : slide.headline;

  // Past six the rows get too short to read across a room, so the type steps
  // down in one move rather than scaling per row.
  const roomy = events.length <= 4;

  return (
    <div className="flex h-full w-full flex-col px-24 py-20">
      <div className="flex items-baseline justify-between">
        <h1
          className={`text-[86px] font-extrabold leading-none tracking-tight ${tone.ink}`}>
          {headline}
        </h1>
        <p
          className={`text-[26px] font-bold uppercase tracking-[0.3em] ${tone.accent}`}>
          Netaville
        </p>
      </div>

      <div className={`mt-12 flex-1 border-t ${tone.rule}`}>
        {events.map(event => (
          <BoardRow
            key={event.id}
            event={event}
            tone={tone}
            roomy={roomy}
            todayIso={today}
          />
        ))}
      </div>
    </div>
  );
}

function BoardRow({
  event,
  tone,
  roomy,
  todayIso,
}: {
  event: BoardEvent;
  tone: Tone;
  roomy: boolean;
  todayIso: string;
}) {
  const today = event.date === todayIso;
  return (
    <div
      className={`flex items-center gap-12 border-b ${tone.rule} ${
        roomy ? 'py-9' : 'py-6'
      }`}>
      {/* The date block is the spine — the thing you scan down from the door. */}
      <div
        className={`w-[150px] shrink-0 rounded-2xl py-4 text-center ${
          today ? 'bg-[#F26A57]' : tone.panel
        }`}>
        <p
          className={`text-[20px] font-bold uppercase tracking-[0.18em] ${
            today ? 'text-white/90' : tone.faint
          }`}>
          {today ? 'Today' : weekday(event.date)}
        </p>
        <p
          className={`text-[54px] font-extrabold leading-none ${
            today ? 'text-white' : tone.ink
          }`}>
          {dayNumber(event.date)}
        </p>
        <p
          className={`text-[20px] font-bold uppercase tracking-[0.18em] ${
            today ? 'text-white/90' : tone.faint
          }`}>
          {month(event.date)}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <h2
          className={`truncate font-extrabold tracking-tight ${tone.ink} ${
            roomy ? 'text-[58px] leading-tight' : 'text-[44px] leading-tight'
          }`}>
          {event.title}
        </h2>
        <p
          className={`mt-1 font-semibold ${tone.muted} ${
            roomy ? 'text-[30px]' : 'text-[24px]'
          }`}>
          {event.startTime}–{event.endTime} · {event.room}
        </p>
      </div>

      <p
        className={`shrink-0 font-bold uppercase tracking-[0.2em] ${tone.accent} ${
          roomy ? 'text-[26px]' : 'text-[21px]'
        }`}>
        {event.category}
      </p>
    </div>
  );
}

/** A commercial: the thing that plays between boards. */
function Commercial({slide, tone}: {slide: ResolvedSlide; tone: Tone}) {
  const hasVideo = slide.videoUrl !== undefined && slide.videoUrl !== '';
  const hasImage =
    !hasVideo && slide.imageUrl !== undefined && slide.imageUrl !== '';
  const noHeadline =
    (slide.headline === undefined || slide.headline === '') &&
    (slide.cta === undefined || slide.cta === '');
  return (
    <div className="relative h-full w-full">
      {hasVideo ? (
        <>
          {/* A full-bleed video ad — filled edge to edge, silent, looping. */}
          <video
            src={slide.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Only dim for legibility when there is text over the video. */}
          {noHeadline ? null : (
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          )}
        </>
      ) : hasImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{backgroundImage: `url(${slide.imageUrl})`}}
          />
          {/* Artwork is unknown, so the text always gets its own ground. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        </>
      ) : (
        <div
          className={
            tone.dark
              ? 'absolute inset-0 bg-gradient-to-br from-[#2B1FC9] via-[#241F6B] to-[#0b0a1f]'
              : 'absolute inset-0 bg-gradient-to-br from-[#2B1FC9] to-[#4B3BE8]'
          }
        />
      )}
      <div className="absolute inset-0 flex flex-col justify-end p-24 text-white">
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

/** One event, at full height. */
function Announcement({event, tone}: {event: BoardEvent; tone: Tone}) {
  return (
    <div
      className={
        tone.dark
          ? 'relative h-full w-full bg-gradient-to-br from-[#2B1FC9] via-[#241F6B] to-[#0b0a1f] text-white'
          : 'relative h-full w-full bg-[#EFECFC] text-[#241F6B]'
      }>
      {/* the logo's ray geometry, bled off the corner like the mobile app */}
      <svg
        viewBox="0 0 100 100"
        className={`absolute -right-20 -top-24 w-[46vw] ${
          tone.dark ? 'opacity-[0.14]' : 'opacity-[0.20]'
        }`}
        aria-hidden>
        {Array.from({length: 7}, (_, ray) => (
          <path
            key={ray}
            d="M50 50 L100 20 L100 34 Z"
            fill={tone.dark ? '#F5B301' : '#2B1FC9'}
            transform={`rotate(${ray * 13} 50 50)`}
          />
        ))}
      </svg>

      <div className="relative flex h-full flex-col justify-center px-28">
        <p
          className={`text-[30px] font-bold uppercase tracking-[0.3em] ${
            tone.dark ? 'text-[#F5B301]' : 'text-[#B8590B]'
          }`}>
          {event.category}
        </p>
        <h1 className="mt-8 max-w-[85%] text-[124px] font-extrabold leading-[0.92] tracking-tight">
          {event.title}
        </h1>
        <div
          className={`mt-14 flex items-center gap-14 text-[44px] font-semibold ${
            tone.dark ? 'text-white/85' : 'text-[#241F6B]/80'
          }`}>
          <span>{formatLongDate(event.date)}</span>
          <span className="opacity-40">·</span>
          <span>
            {event.startTime}–{event.endTime}
          </span>
          <span className="opacity-40">·</span>
          <span>{event.room}</span>
        </div>
      </div>
    </div>
  );
}

function Fallback({label, tone}: {label: string; tone: Tone}) {
  return (
    <div className="grid h-full w-full place-items-center">
      <p className={`text-[34px] font-medium ${tone.faint}`}>{label}</p>
    </div>
  );
}
