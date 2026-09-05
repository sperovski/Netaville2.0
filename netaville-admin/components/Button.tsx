'use client';

import type {ButtonHTMLAttributes, ReactNode} from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'quiet';
type Size = 'sm' | 'md';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
};

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-on-brand border-brand hover:bg-brand/90 disabled:bg-brand/40',
  ghost:
    'bg-surface text-brand border-brand-edge hover:bg-brand-tint disabled:text-dim',
  danger:
    'bg-coral text-on-brand border-coral hover:bg-coral/90 disabled:bg-coral/40',
  quiet:
    'bg-transparent text-muted border-transparent hover:bg-line/50 hover:text-ink',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12.5px] gap-1.5',
  md: 'h-10 px-4 text-[13.5px] gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-control border font-semibold tracking-tight transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}>
      {icon}
      {children}
    </button>
  );
}
