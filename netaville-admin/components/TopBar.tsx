'use client';

import {useRouter} from 'next/navigation';
import {useState, type ReactNode} from 'react';
import {Button} from './Button';

type Props = {
  title: string;
  hint?: string;
  action?: ReactNode;
  admin: {name: string; email: string};
};

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0] ?? '')
    .join('')
    .toUpperCase();
}

export function TopBar({title, hint, action, admin}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await fetch('/api/auth/logout', {method: 'POST'});
    router.replace('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-6 border-b border-line bg-page/85 px-8 py-4 backdrop-blur">
      <div className="space-y-0.5">
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {hint === undefined ? null : (
          <p className="text-[13px] text-muted">{hint}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {action}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(current => !current)}
            aria-expanded={open}
            className="flex items-center gap-2.5 rounded-control border border-line bg-surface py-1.5 pl-1.5 pr-3 transition-colors hover:bg-brand-tint/40">
            <span className="grid size-8 place-items-center rounded-[9px] bg-brand text-[12px] font-extrabold text-on-brand">
              {initials(admin.name)}
            </span>
            <span className="text-left">
              <span className="block text-[12.5px] font-bold leading-tight text-ink">
                {admin.name}
              </span>
              <span className="block text-[11px] leading-tight text-dim">
                Admin
              </span>
            </span>
          </button>

          {open ? (
            <>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute right-0 z-20 mt-2 w-60 rounded-card border border-line bg-surface p-3 shadow-pop">
                <p className="truncate px-1 pb-2 text-[12.5px] text-muted">
                  {admin.email}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => void signOut()}>
                  Log out
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
