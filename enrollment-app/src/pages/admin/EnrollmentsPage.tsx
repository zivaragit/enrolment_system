/** Enrollment table: search, filter, sort, paginate, export (FR-2.3–2.7). */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnrollments } from '@/hooks/useEnrollments';
import { DataTable, type SortKey, type SortDir } from '@/components/DataTable';
import { Spinner } from '@/components/Spinner';
import { PROGRAM_OPTIONS, STATUS_OPTIONS } from '@/config/formSchema';
import {
  fetchAllEnrollments,
  type EnrollmentFilters,
} from '@/lib/enrollments';
import { exportToCsv, exportToExcel } from '@/lib/export';
import type { Enrollment, EnrollmentStatus } from '@/types/enrollment';

export default function EnrollmentsPage() {
  const navigate = useNavigate();

  // Draft inputs (search is debounced into `filters`).
  const [searchInput, setSearchInput] = useState('');
  const [program, setProgram] = useState('');
  const [status, setStatus] = useState<EnrollmentStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [exporting, setExporting] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters: EnrollmentFilters = useMemo(
    () => ({ program, status, dateFrom, dateTo, search }),
    [program, status, dateFrom, dateTo, search],
  );

  const { rows, page, hasMore, loading, error, nextPage, prevPage, refresh } =
    useEnrollments(filters);

  // Sort the current page client-side.
  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortKey === 'createdAt') {
        av = a.createdAt?.getTime() ?? 0;
        bv = b.createdAt?.getTime() ?? 0;
      } else {
        av = String(a[sortKey] ?? '').toLowerCase();
        bv = String(b[sortKey] ?? '').toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const resetFilters = () => {
    setSearchInput('');
    setProgram('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
  };

  const runExport = async (kind: 'csv' | 'xlsx') => {
    setExporting(true);
    try {
      const all: Enrollment[] = await fetchAllEnrollments(filters);
      if (kind === 'csv') exportToCsv(all);
      else exportToExcel(all);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Enrollments</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => runExport('csv')} className="btn-secondary" disabled={exporting}>
            Export CSV
          </button>
          <button onClick={() => runExport('xlsx')} className="btn-primary" disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="label">Search</label>
            <input
              type="search"
              className="input"
              placeholder="Name, email, phone, ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Program</label>
            <select className="input" value={program} onChange={(e) => setProgram(e.target.value)}>
              <option value="">All programs</option>
              {PROGRAM_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as EnrollmentStatus | '')}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="label">From</label>
              <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="label">To</label>
              <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={resetFilters} className="btn-secondary w-full">Reset</button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={refresh} className="ml-2 underline">Retry</button>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <Spinner label="Loading enrollments…" />
        ) : (
          <DataTable
            rows={sortedRows}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            onRowClick={(e) => navigate(`/admin/enrollments/${e.id}`)}
          />
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
          <span className="text-slate-500">
            Page {page + 1}
            {!loading && ` · ${sortedRows.length} on this page`}
          </span>
          <div className="flex gap-2">
            <button onClick={prevPage} disabled={page === 0 || loading} className="btn-secondary px-3 py-1.5">
              ← Prev
            </button>
            <button onClick={nextPage} disabled={!hasMore || loading} className="btn-secondary px-3 py-1.5">
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
