/** Display helpers. All stored timestamps are UTC; shown in local tz (NFR-6). */
import { format } from 'date-fns';
import {
  PROGRAM_OPTIONS,
  STATUS_OPTIONS,
  type FieldOption,
} from '@/config/formSchema';

export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return '—';
  return format(d, 'dd MMM yyyy, HH:mm');
}

export function formatDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return format(d, 'dd MMM yyyy');
}

const optLabel = (options: FieldOption[], value?: string): string => {
  if (!value) return '—';
  return options.find((o) => o.value === value)?.label ?? value;
};

export const programLabel = (value?: string) => optLabel(PROGRAM_OPTIONS, value);
export const statusLabel = (value?: string) => optLabel(STATUS_OPTIONS, value);

export function statusBadgeClass(status?: string): string {
  switch (status) {
    case 'verified':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    case 'new':
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

/** Normalises a phone string to a comparable form (digits + leading +). */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^0-9]/g, '');
  return (hasPlus ? '+' : '') + digits;
}
