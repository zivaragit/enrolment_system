/**
 * FormField — renders one input from a FieldDef (config-driven, FR-1.2).
 * Wired to react-hook-form via register + the field-level error.
 */
import type { UseFormRegister } from 'react-hook-form';
import type { FieldDef } from '@/config/formSchema';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  field: FieldDef;
  error?: { message?: string };
}

export function FormField({ register, field, error }: Props) {
  const id = field.name.replace(/\./g, '-');
  const inputClass = `input ${error ? 'input-error' : ''}`;
  const describedBy = field.helpText ? `${id}-help` : undefined;

  return (
    <div>
      <label htmlFor={id} className="label">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {field.type === 'select' ? (
        <select id={id} className={inputClass} aria-describedby={describedBy} {...register(field.name)} defaultValue="">
          <option value="" disabled={field.required}>
            Select…
          </option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          id={id}
          rows={3}
          className={inputClass}
          placeholder={field.placeholder}
          aria-describedby={describedBy}
          {...register(field.name)}
        />
      ) : (
        <input
          id={id}
          type={field.type}
          className={inputClass}
          placeholder={field.placeholder}
          aria-describedby={describedBy}
          {...register(field.name)}
        />
      )}

      {field.helpText && !error && (
        <p id={`${id}-help`} className="mt-1 text-xs text-slate-500">
          {field.helpText}
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error.message}</p>}
    </div>
  );
}
