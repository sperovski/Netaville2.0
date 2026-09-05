'use client';

import {useEffect, type ReactNode} from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "drawer" slides in from the right; "modal" centres a dialog. */
  variant?: 'drawer' | 'modal';
};

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  variant = 'drawer',
}: Props) {
  // Escape closes, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const {overflow} = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const isModal = variant === 'modal';

  return (
    <div
      className={`fixed inset-0 z-50 flex ${isModal ? 'items-center justify-center p-8' : 'justify-end'}`}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/25 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex flex-col bg-surface shadow-pop ${
          isModal
            ? 'max-h-full w-full max-w-2xl rounded-card border border-line'
            : 'h-full w-full max-w-xl border-l border-line'
        }`}>
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold tracking-tight text-ink">
              {title}
            </h2>
            {subtitle === undefined ? null : (
              <p className="text-[13px] text-muted">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-control border border-line text-muted transition-colors hover:bg-page hover:text-ink">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer === undefined ? null : (
          <footer className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
