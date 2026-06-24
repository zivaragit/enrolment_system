/** Full enrollment detail + status update (FR-2.6, FR-2.9). */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getEnrollmentById,
  updateEnrollmentStatus,
} from '@/lib/enrollments';
import { Spinner } from '@/components/Spinner';
import { STATUS_OPTIONS, FORM_FIELDS } from '@/config/formSchema';
import {
  formatDateTime,
  formatDate,
  programLabel,
  statusBadgeClass,
  statusLabel,
} from '@/lib/format';
import type { Enrollment, EnrollmentStatus } from '@/types/enrollment';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-3 sm:flex-row sm:items-center">
      <dt className="w-56 shrink-0 text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value || '—'}</dd>
    </div>
  );
}

export default function EnrollmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const r = await getEnrollmentById(id);
        if (!active) return;
        if (!r) setNotFound(true);
        else setRecord(r);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const onStatusChange = async (status: EnrollmentStatus) => {
    if (!record) return;
    setSavingStatus(true);
    try {
      await updateEnrollmentStatus(record.id, status);
      setRecord({ ...record, status });
    } catch {
      alert('Could not update status. Please try again.');
    } finally {
      setSavingStatus(false);
    }
  };

  if (loading) return <Spinner label="Loading enrollment…" />;

  if (notFound || !record) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-600">Enrollment not found.</p>
        <Link to="/admin/enrollments" className="btn-secondary mt-4 inline-flex">
          Back to list
        </Link>
      </div>
    );
  }

  const hasAddress =
    record.address &&
    (record.address.line1 || record.address.city || record.address.state || record.address.zip);

  const genderLabel =
    FORM_FIELDS.find((f) => f.name === 'gender')?.options?.find((o) => o.value === record.gender)
      ?.label ?? record.gender;
  const sourceLabel =
    FORM_FIELDS.find((f) => f.name === 'source')?.options?.find((o) => o.value === record.source)
      ?.label ?? record.source;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-700">
          ← Back
        </button>
        <span className={`badge ${statusBadgeClass(record.status)}`}>
          {statusLabel(record.status)}
        </span>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{record.fullName}</h1>
            <p className="font-mono text-xs text-slate-500">{record.enrollmentId}</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="status" className="text-sm text-slate-500">Status:</label>
            <select
              id="status"
              className="input w-40"
              value={record.status}
              disabled={savingStatus}
              onChange={(e) => onStatusChange(e.target.value as EnrollmentStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <dl>
          <Row label="Email" value={record.email} />
          <Row label="Phone" value={record.phone} />
          <Row label="Date of Birth" value={record.dob ? formatDate(new Date(record.dob)) : '—'} />
          <Row label="Gender" value={genderLabel} />
          <Row label="Program / Course" value={programLabel(record.program)} />
          <Row label="How did you hear about us" value={sourceLabel} />
          {hasAddress && (
            <Row
              label="Address"
              value={
                <span>
                  {[
                    record.address?.line1,
                    record.address?.city,
                    record.address?.state,
                    record.address?.zip,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              }
            />
          )}
          <Row label="Submitted At" value={formatDateTime(record.createdAt)} />
        </dl>
      </div>
    </div>
  );
}
