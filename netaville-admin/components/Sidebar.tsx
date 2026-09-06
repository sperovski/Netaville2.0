'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {BrandMark} from './BrandMark';

type Item = {href: string; label: string; icon: string};

/** Single-path icons, so nav art needs no icon dependency. */
const items: Item[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z',
  },
  {
    href: '/requests',
    label: 'Event requests',
    icon: 'M5 4h14v16l-7-3.5L5 20V4Z',
  },
  {
    href: '/events',
    label: 'Events',
    icon: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm-1 5h16M8 3v4m8-4v4',
  },
  {
    href: '/counter',
    label: 'Counter',
    icon: 'M4 4h16v4H4V4Zm2 4v12h12V8M9 12h6',
  },
  {
    href: '/students',
    label: 'Students',
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8a8 8 0 0 1 16 0',
  },
  {
    href: '/displays',
    label: 'TV displays',
    icon: 'M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 16h8',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col border-r border-line bg-surface">
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 border-b border-line px-5 py-[18px]">
        <BrandMark />
        <span className="text-[15px] font-extrabold tracking-tight text-ink">
          Netaville
          <span className="ml-1.5 rounded-full bg-brand-tint px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-brand">
            Admin
          </span>
        </span>
      </Link>

      <ul className="flex-1 space-y-1 p-3">
        {items.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-control px-3 py-2.5 text-[13.5px] font-semibold transition-colors ${
                  active
                    ? 'bg-brand text-on-brand'
                    : 'text-muted hover:bg-brand-tint/60 hover:text-brand'
                }`}>
                <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
                  <path
                    d={item.icon}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-line px-5 py-4 text-[11.5px] leading-relaxed text-dim">
        Staff panel. Students use the mobile app.
      </p>
    </nav>
  );
}
