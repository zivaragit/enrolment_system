/** Dashboard charts (FR-2.8) using Recharts. */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardStats } from '@/lib/enrollments';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6'];

export function EnrollmentsOverTimeChart({ data }: { data: DashboardStats['overTime'] }) {
  if (!data.length) {
    return <EmptyChart label="No enrollments yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function EnrollmentsByProgramChart({ data }: { data: DashboardStats['byProgram'] }) {
  const filtered = data.filter((d) => d.count > 0);
  if (!filtered.length) {
    return <EmptyChart label="No enrollments yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={filtered} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2ff" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {filtered.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProgramSharePie({ data }: { data: DashboardStats['byProgram'] }) {
  const filtered = data.filter((d) => d.count > 0);
  if (!filtered.length) {
    return <EmptyChart label="No enrollments yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={(e: { label: string }) => e.label}
        >
          {filtered.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
      {label}
    </div>
  );
}
