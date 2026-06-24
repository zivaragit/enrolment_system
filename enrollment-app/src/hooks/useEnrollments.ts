/**
 * useEnrollments — drives the admin table.
 *
 * Strategy:
 *   • No date-range / search filters → cursor-based server pagination
 *     (cheap, scales to 10k+ records — NFR-5).
 *   • Date-range or search active → fetch the equality-filtered set and
 *     paginate client-side (Firestore has no native full-text search).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import {
  fetchAllEnrollments,
  fetchEnrollmentsPage,
  PAGE_SIZE,
  type EnrollmentFilters,
} from '@/lib/enrollments';
import type { Enrollment } from '@/types/enrollment';

const isClientMode = (f: EnrollmentFilters) =>
  Boolean(f.search?.trim() || f.dateFrom || f.dateTo);

export function useEnrollments(filters: EnrollmentFilters) {
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server-pagination cursors (one per loaded page boundary).
  const cursors = useRef<(QueryDocumentSnapshot<DocumentData> | null)[]>([]);
  // Full client-side dataset when in client mode.
  const clientSet = useRef<Enrollment[]>([]);

  const filterKey = JSON.stringify(filters);

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        if (isClientMode(filters)) {
          if (targetPage === 0 || clientSet.current.length === 0) {
            clientSet.current = await fetchAllEnrollments(filters);
          }
          const start = targetPage * PAGE_SIZE;
          const slice = clientSet.current.slice(start, start + PAGE_SIZE);
          setRows(slice);
          setHasMore(start + PAGE_SIZE < clientSet.current.length);
        } else {
          const prevCursor = targetPage === 0 ? null : cursors.current[targetPage - 1] ?? null;
          const res = await fetchEnrollmentsPage(filters, prevCursor);
          cursors.current[targetPage] = res.cursor;
          setRows(res.rows);
          setHasMore(res.hasMore);
        }
        setPage(targetPage);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load enrollments.');
        setRows([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  // Reload from page 0 whenever filters change.
  useEffect(() => {
    cursors.current = [];
    clientSet.current = [];
    void load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const nextPage = useCallback(() => {
    if (hasMore) void load(page + 1);
  }, [hasMore, page, load]);

  const prevPage = useCallback(() => {
    if (page > 0) void load(page - 1);
  }, [page, load]);

  const refresh = useCallback(() => {
    cursors.current = [];
    clientSet.current = [];
    void load(0);
  }, [load]);

  return { rows, page, hasMore, loading, error, nextPage, prevPage, refresh };
}
