/** Enrollment data table with sortable columns (FR-2.3, FR-2.5). */
import type { Enrollment } from '@/types/enrollment';
import { programLabel, statusLabel, statusBadgeClass, formatDateTime } from '@/lib/format';

export type SortKey = 'enrollmentId' | 'fullName' | 'email' | 'program' | 'status' | 'createdAt';
export type SortDir = 'asc' | 'desc';

interface Column {
  key: SortKey;
  label: string;
  sortable?: boolean;
  render: (e: Enrollment) => React.ReactNode;
  className?: string;
}

const columns: Column[] = [
  { key: 'enrollmentId', label: 'ID', sortable: true, render: (e) => (
      <span className="font-mono text-xs text-slate-500">{e.enrollmentId}</span>
    ) },
  { key: 'fullName', label: 'Name', sortable: true, render: (e) => (
      <span className="font-medium text-slate-900">{e.fullName}</span>
    ) },
  { key: 'email', label: 'Email', sortable: true, render: (e) => e.email },
  { key: 'program', label: 'Program', sortable: true, render: (e) => programLabel(e.program) },
  { key: 'status', label: 'Status', sortable: true, render: (e) => (
      <span className={`badge ${statusBadgeClass(e.status)}`}>{statusLabel(e.status)}</span>
    ) },
  { key: 'createdAt', label: 'Submitted', sortable: true, render: (e) => (
      <span className="whitespace-nowrap text-slate-600">{formatDateTime(e.createdAt)}</span>
    ) },
];

interface Props {
  rows: Enrollment[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onRowClick: (e: Enrollment) => void;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-slate-300">↕</span>;
  return <span className="ml-1 text-brand-600">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export function DataTable({ rows, sortKey, sortDir, onSort, onRowClick }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className="inline-flex items-center hover:text-slate-700"
                  >
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((e) => (
            <tr
              key={e.id}
              onClick={() => onRowClick(e)}
              className="cursor-pointer transition hover:bg-brand-50/40"
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-slate-700 ${col.className ?? ''}`}>
                  {col.render(e)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                No enrollments match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
