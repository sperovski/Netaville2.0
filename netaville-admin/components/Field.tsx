'use client';

import type {InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes} from 'react';

const base =
  'w-full rounded-control border border-line bg-surface px-3 py-2.5 text-[13.5px] text-ink outline-none transition-colors placeholder:text-dim focus:border-brand focus:ring-2 focus:ring-brand/15';

export function Label({children}: {children: ReactNode}) {
  return (
    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-dim">
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <Label>{label}</Label>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const {className = '', ...rest} = props;
  return <input {...rest} className={`${base} ${className}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const {className = '', ...rest} = props;
  return <textarea {...rest} className={`${base} resize-y ${className}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const {className = '', ...rest} = props;
  return <select {...rest} className={`${base} ${className}`} />;
}
