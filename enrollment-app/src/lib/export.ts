/** CSV / Excel export helpers (FR-2.7) using SheetJS. */
import * as XLSX from 'xlsx';
import type { Enrollment } from '@/types/enrollment';
import { programLabel, statusLabel, formatDateTime } from './format';

/** Flattens an enrollment into a single-level row for tabular export. */
function toRow(e: Enrollment): Record<string, string> {
  return {
    'Enrollment ID': e.enrollmentId,
    'Full Name': e.fullName,
    Email: e.email,
    Phone: e.phone,
    'Date of Birth': e.dob ?? '',
    Gender: e.gender ?? '',
    Program: programLabel(e.program),
    Source: e.source ?? '',
    'Address Line': e.address?.line1 ?? '',
    City: e.address?.city ?? '',
    State: e.address?.state ?? '',
    'ZIP': e.address?.zip ?? '',
    Status: statusLabel(e.status),
    'Submitted At': formatDateTime(e.createdAt),
  };
}

function buildSheet(rows: Enrollment[]): XLSX.WorkSheet {
  const data = rows.map(toRow);
  const ws = XLSX.utils.json_to_sheet(data);
  // Reasonable default column widths.
  ws['!cols'] = [
    { wch: 16 }, { wch: 22 }, { wch: 26 }, { wch: 16 }, { wch: 12 },
    { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 24 }, { wch: 16 },
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 20 },
  ];
  return ws;
}

function timestampedName(prefix: string, ext: string): string {
  // Build a filesystem-safe timestamp without relying on locale.
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}`;
  return `${prefix}-${stamp}.${ext}`;
}

export function exportToExcel(rows: Enrollment[]): void {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSheet(rows), 'Enrollments');
  XLSX.writeFile(wb, timestampedName('enrollments', 'xlsx'));
}

export function exportToCsv(rows: Enrollment[]): void {
  const ws = buildSheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = timestampedName('enrollments', 'csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
