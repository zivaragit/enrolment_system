/**
 * Builds a Zod schema dynamically from the field config in formSchema.ts.
 * Because the form is config-driven, validation rules are derived — never
 * hand-maintained in parallel with the field list.
 */
import { z } from 'zod';
import { FORM_FIELDS, type FieldDef } from './formSchema';

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function fieldValidator(field: FieldDef): z.ZodTypeAny {
  let base: z.ZodTypeAny;

  switch (field.type) {
    case 'email':
      base = z
        .string()
        .trim()
        .regex(emailRegex, 'Enter a valid email address.');
      break;

    case 'date':
      base = z.string().refine((v) => !v || !Number.isNaN(Date.parse(v)), {
        message: 'Enter a valid date.',
      });
      break;

    case 'tel':
    case 'text':
    default: {
      let s = z.string().trim();
      if (field.pattern) {
        s = s.regex(new RegExp(field.pattern), field.patternMessage ?? 'Invalid format.');
      }
      base = s;
      break;
    }

    case 'select':
    case 'textarea':
      base = z.string().trim();
      break;
  }

  if (field.required) {
    // For required strings, ensure non-empty.
    if (base instanceof z.ZodString) {
      base = base.min(1, `${field.label} is required.`);
    } else {
      base = base.refine((v) => v !== undefined && v !== '', {
        message: `${field.label} is required.`,
      });
    }
  } else {
    base = base.optional().or(z.literal(''));
  }

  return base;
}

/**
 * Produces a nested Zod object schema matching the dot-path field names.
 * e.g. "address.city" → { address: { city: ... } }
 */
export function buildEnrollmentSchema() {
  // Group fields by top-level key.
  const topLevel: Record<string, z.ZodTypeAny> = {};
  const nested: Record<string, Record<string, z.ZodTypeAny>> = {};

  for (const field of FORM_FIELDS) {
    const validator = fieldValidator(field);
    if (field.name.includes('.')) {
      const [group, key] = field.name.split('.');
      nested[group] = nested[group] ?? {};
      nested[group][key] = validator;
    } else {
      topLevel[field.name] = validator;
    }
  }

  for (const [group, shape] of Object.entries(nested)) {
    topLevel[group] = z.object(shape);
  }

  return z.object(topLevel);
}

export const enrollmentSchema = buildEnrollmentSchema();
export type EnrollmentFormValues = z.infer<typeof enrollmentSchema>;
