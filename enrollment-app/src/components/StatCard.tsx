import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: 'brand' | 'green' | 'amber' | 'sky';
}

const accents: Record<NonNullable<Props['accent']>, string> = {
  brand: 'text-brand-600 bg-brand-50',
  green: 'text-green-600 bg-green-50',
  amber: 'text-amber-600 bg-amber-50',
  sky: 'text-sky-600 bg-sky-50',
};

export function StatCard({ label, value, hint, accent = 'brand' }: Props) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`badge ${accents[accent]}`}>●</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
