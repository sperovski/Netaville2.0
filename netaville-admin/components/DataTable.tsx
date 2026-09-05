import type {ReactNode} from 'react';

export type Column<Row> = {
  key: string;
  header: string;
  /** Tailwind width utility, e.g. "w-40". */
  width?: string;
  align?: 'left' | 'right';
  render: (row: Row) => ReactNode;
};

type Props<Row> = {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  empty?: string;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty = 'Nothing here yet.',
}: Props<Row>) {
  if (rows.length === 0) {
    return (
      <p className="px-5 py-12 text-center text-[13.5px] text-muted">{empty}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            {columns.map(column => (
              <th
                key={column.key}
                scope="col"
                className={`px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-dim ${column.width ?? ''} ${column.align === 'right' ? 'text-right' : ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick === undefined ? undefined : () => onRowClick(row)}
              className={`border-b border-line/70 last:border-0 ${
                onRowClick === undefined
                  ? ''
                  : 'cursor-pointer transition-colors hover:bg-brand-tint/40'
              }`}>
              {columns.map(column => (
                <td
                  key={column.key}
                  className={`px-5 py-3.5 align-middle text-[13.5px] text-ink ${column.align === 'right' ? 'text-right' : ''}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
