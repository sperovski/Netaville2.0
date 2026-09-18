'use client';

import {useCallback, useEffect, useState} from 'react';
import type {ScreenFeed} from '@/lib/types';
import {ScreenPlayer} from '../screen/[id]/ScreenPlayer';

/**
 * The self-enrolling TV client.
 *
 * A screen opens `/tv` once and never touches a URL again:
 *
 *   1. No stored token → POST /api/tv/enroll, keep the token it hands back.
 *   2. Fetch /api/tv/feed with that token as a bearer.
 *      - ok → hand the feed to <ScreenPlayer>, which polls from here on.
 *      - 401 → the screen was deleted in the panel; drop the token, start over.
 *      - network down → fall back to the last feed cached in localStorage so a
 *        reboot with no uplink still shows the last good rotation.
 *
 * While the screen is unclaimed the feed carries `paired: false`, and
 * <ScreenPlayer> already knows to show the pairing code big on the wall. The
 * admin types that code into the panel; the next poll comes back paired and the
 * rotation starts. No reload.
 */

const TOKEN_KEY = 'netaville.tv.token';
const FEED_CACHE_KEY = 'netaville.tv.feed';

/**
 * The enrolment in flight, if any.
 *
 * Module scope rather than a ref because it has to dedupe across renders *and*
 * across React's development double-invoke: two concurrent enrolments would
 * mint two screens and leave a junk row in the panel every time a developer
 * reloads the page.
 */
let enrolling: Promise<string> | null = null;

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Private mode or storage disabled — the token still lives in memory for
    // this run, and the screen re-enrols on the next boot.
  }
}

function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(FEED_CACHE_KEY);
  } catch {
    /* nothing to clean up */
  }
}

function readCachedFeed(): ScreenFeed | null {
  try {
    const raw = localStorage.getItem(FEED_CACHE_KEY);
    return raw === null ? null : (JSON.parse(raw) as ScreenFeed);
  } catch {
    return null;
  }
}

/** A few facts about the device, for the panel's diagnostics column. */
function deviceInfo(): Record<string, unknown> {
  if (typeof window === 'undefined') {
    return {};
  }
  return {
    ua: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    dpr: window.devicePixelRatio,
    lang: navigator.language,
  };
}

type State =
  | {phase: 'starting'}
  | {phase: 'error'; message: string}
  | {phase: 'playing'; token: string; feed: ScreenFeed; stale: boolean};

export function TvClient() {
  const [state, setState] = useState<State>({phase: 'starting'});
  /** Bumped to ask for another attempt after a failure. */
  const [attempt, setAttempt] = useState(0);

  const enrol = useCallback(async (): Promise<string> => {
    enrolling ??= (async () => {
      const response = await fetch('/api/tv/enroll', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({device: deviceInfo()}),
      });
      if (!response.ok) {
        throw new Error(`enrol failed (${response.status})`);
      }
      const data = (await response.json()) as {deviceToken: string};
      writeToken(data.deviceToken);
      return data.deviceToken;
    })().finally(() => {
      enrolling = null;
    });
    return enrolling;
  }, []);

  const start = useCallback(async () => {
    let token = readToken();
    try {
      if (token === null) {
        token = await enrol();
      }

      let response = await fetch('/api/tv/feed', {
        cache: 'no-store',
        headers: {Authorization: `Bearer ${token}`},
      });

      if (response.status === 401) {
        // Token is dead — the screen was removed. Enrol fresh once.
        clearToken();
        token = await enrol();
        response = await fetch('/api/tv/feed', {
          cache: 'no-store',
          headers: {Authorization: `Bearer ${token}`},
        });
      }

      if (!response.ok) {
        throw new Error(`feed failed (${response.status})`);
      }

      const feed = (await response.json()) as ScreenFeed;
      try {
        localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(feed));
      } catch {
        /* cache is best-effort */
      }
      setState({phase: 'playing', token, feed, stale: false});
    } catch {
      // Could not reach the panel. If this device has played before, run the
      // last rotation it saw rather than sitting on an error screen.
      const cached = readCachedFeed();
      if (cached !== null && token !== null) {
        setState({phase: 'playing', token, feed: cached, stale: true});
        return;
      }
      setState({
        phase: 'error',
        message: 'Waiting for Netaville…',
      });
      // Ask for another go rather than calling ourselves: a self-reference
      // inside the callback captures the binding before it is assigned.
      // A panel that comes up after the TV will just work.
      setTimeout(() => setAttempt(count => count + 1), 15_000);
    }
  }, [enrol]);

  useEffect(() => {
    // Fetching the feed on mount is the one thing this component exists to do,
    // and every setState inside `start` happens after an await. The rule cannot
    // see through the async call, so it reads this as a synchronous cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void start();
  }, [start, attempt]);

  if (state.phase === 'playing') {
    return (
      <ScreenPlayer
        screenId={state.feed.screen.id}
        initialFeed={state.feed}
        feedUrl="/api/tv/feed"
        feedHeaders={{Authorization: `Bearer ${state.token}`}}
        cacheKey={FEED_CACHE_KEY}
      />
    );
  }

  return (
    <div className="screen-stage grid h-screen w-screen place-items-center bg-[#0b0a1f] text-white">
      <div className="text-center">
        <p className="text-[26px] font-semibold uppercase tracking-[0.35em] text-white/40">
          Netaville
        </p>
        <p className="mt-8 text-[32px] font-medium text-white/70">
          {state.phase === 'error' ? state.message : 'Starting up…'}
        </p>
      </div>
    </div>
  );
}
