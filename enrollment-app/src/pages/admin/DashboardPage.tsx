/** Dashboard home — summary cards + charts (FR-2.2, FR-2.8). */
import { useEffect, useState } from 'react';
import { fetchDashboardStats, type DashboardStats } from '@/lib/enrollments';
import { StatCard } from '@/components/StatCard';
import { Spinner } from '@/components/Spinner';
import {
  EnrollmentsByProgramChart,
  EnrollmentsOverTimeChart,
  ProgramSharePie,
} from '@/components/Charts';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await fetchDashboardStats();
        if (active) setStats(s);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load stats.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Enrollments" value={stats.total} accent="brand" />
        <StatCard label="Today" value={stats.today} accent="green" hint="Submitted today (UTC)" />
        <StatCard label="This Week" value={stats.thisWeek} accent="sky" hint="Since Monday" />
        <StatCard label="This Month" value={stats.thisMonth} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Enrollments Over Time</h2>
          <EnrollmentsOverTimeChart data={stats.overTime} />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Enrollments by Program</h2>
          <EnrollmentsByProgramChart data={stats.byProgram} />
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Program Share</h2>
        <div className="mx-auto max-w-md">
          <ProgramSharePie data={stats.byProgram} />
        </div>
      </section>
    </div>
  );
}
