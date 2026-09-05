import type {ReactNode} from 'react';

export type Tone =
  | 'brand'
  | 'coral'
  | 'gold'
  | 'cyan'
  | 'success'
  | 'neutral';

const tones: Record<Tone, string> = {
  brand: 'bg-brand-tint text-brand border-brand-edge',
  coral: 'bg-coral-tint text-coral-ink border-coral-edge',
  gold: 'bg-gold-tint text-gold-ink border-gold-edge',
  cyan: 'bg-cyan-tint text-cyan-ink border-cyan-edge',
  success: 'bg-success-tint text-success border-success-edge',
  neutral: 'bg-page text-muted border-line',
};

export function StatusPill({
  tone = 'neutral',
  children,
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  /** Prefix with a filled dot, for online/offline style states. */
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${tones[tone]}`}>
      {dot ? (
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}
