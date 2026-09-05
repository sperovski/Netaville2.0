import type {ReactNode} from 'react';
import {Sidebar} from './Sidebar';
import {TopBar} from './TopBar';

type Props = {
  title: string;
  hint?: string;
  action?: ReactNode;
  admin: {name: string; email: string};
  children: ReactNode;
};

/** The desktop frame every admin page sits in. */
export function Shell({title, hint, action, admin, children}: Props) {
  return (
    <div className="flex min-h-screen min-w-[1024px]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} hint={hint} action={action} admin={admin} />
        <main className="flex-1 px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
