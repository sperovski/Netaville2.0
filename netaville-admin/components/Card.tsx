import type {ReactNode} from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  /** Removes the inner padding, for tables that run edge to edge. */
  flush?: boolean;
};

export function Card({children, className = '', flush = false}: Props) {
  return (
    <section
      className={`rounded-card border border-line bg-surface shadow-card ${flush ? '' : 'p-5'} ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 pb-4">
      <div className="space-y-0.5">
        <h2 className="text-[15px] font-bold tracking-tight text-ink">
          {title}
        </h2>
        {hint === undefined ? null : (
          <p className="text-[13px] text-muted">{hint}</p>
        )}
      </div>
      {action}
    </header>
  );
}
