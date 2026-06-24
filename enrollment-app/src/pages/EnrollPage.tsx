/** Public enrollment form (FR-1). Renders entirely from formSchema config. */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { FORM_FIELDS, FORM_SECTIONS } from '@/config/formSchema';
import { enrollmentSchema, type EnrollmentFormValues } from '@/config/validation';
import { FormField } from '@/components/FormField';
import {
  createEnrollment,
  DuplicateEnrollmentError,
  type EnrollmentInput,
} from '@/lib/enrollments';

// react-hook-form resolves nested "address.city" errors as objects.
type FieldErrors = Record<string, { message?: string } | undefined>;

function flattenError(errors: unknown, name: string): { message?: string } | undefined {
  const parts = name.split('.');
  let node: unknown = errors;
  for (const p of parts) {
    if (node && typeof node === 'object' && p in node) {
      node = (node as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return node as { message?: string } | undefined;
}

export default function EnrollPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const enrollmentId = await createEnrollment(values as unknown as EnrollmentInput);
      navigate('/success', { state: { enrollmentId } });
    } catch (err) {
      if (err instanceof DuplicateEnrollmentError) {
        const field = err.message.includes('email') ? 'email' : 'phone';
        setError(field as keyof EnrollmentFormValues, { message: err.message });
        setSubmitError(err.message);
      } else {
        setSubmitError(
          'Something went wrong while submitting your enrollment. Please try again.',
        );
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
            E
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Enrollment Form</h1>
          <p className="mt-1 text-sm text-slate-500">
            Fill in your details below to enroll. Fields marked
            <span className="text-red-500"> *</span> are required.
          </p>
        </header>

        <form onSubmit={onSubmit} noValidate className="card p-6 sm:p-8">
          {FORM_SECTIONS.map((section) => {
            const fields = FORM_FIELDS.filter((f) => (f.section ?? 'Details') === section);
            return (
              <fieldset key={section} className="mb-6 last:mb-0">
                <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-700">
                  {section}
                </legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {fields.map((field) => (
                    <div
                      key={field.name}
                      className={field.type === 'textarea' ? 'sm:col-span-2' : ''}
                    >
                      <FormField
                        register={register}
                        field={field}
                        error={flattenError(errors as FieldErrors, field.name)}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
            );
          })}

          {submitError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Link to="/admin/login" className="text-xs text-slate-400 hover:text-slate-600">
              Admin login
            </Link>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit Enrollment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
