/**
 * ───────────────────────────────────────────────────────────────────────────
 * formSchema.ts — SINGLE SOURCE OF TRUTH for the enrollment form.
 *
 * The public enrollment form, the Zod validation schema, the admin table
 * columns, and the export all derive from this file. When the client
 * finalises their field list (see Open Questions in the requirement doc),
 * edit THIS file only — the rest of the app adapts automatically.
 *
 * NOTE: the field set below is the "placeholder field set" from FR-1.2.
 * ───────────────────────────────────────────────────────────────────────────
 */

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'date'
  | 'select'
  | 'textarea';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  /** Dot-path key. Nested keys (e.g. "address.city") are grouped into objects. */
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FieldOption[];
  /** Custom regex (string source) applied to text/tel fields. */
  pattern?: string;
  patternMessage?: string;
  /** Layout grouping — fields sharing a section render under one heading. */
  section?: string;
  /** Show this column in the admin enrollments table by default. */
  showInTable?: boolean;
}

/** Program / course options (FR-1.2). Edit freely once client confirms. */
export const PROGRAM_OPTIONS: FieldOption[] = [
  { value: 'web-development', label: 'Web Development' },
  { value: 'data-science', label: 'Data Science' },
  { value: 'ui-ux-design', label: 'UI/UX Design' },
  { value: 'digital-marketing', label: 'Digital Marketing' },
  { value: 'cloud-computing', label: 'Cloud Computing' },
  { value: 'cyber-security', label: 'Cyber Security' },
];

const GENDER_OPTIONS: FieldOption[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const SOURCE_OPTIONS: FieldOption[] = [
  { value: 'search-engine', label: 'Search engine' },
  { value: 'social-media', label: 'Social media' },
  { value: 'friend-referral', label: 'Friend / referral' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'event', label: 'Event / seminar' },
  { value: 'other', label: 'Other' },
];

/** Enrollment status values (FR-2.9). */
export const STATUS_OPTIONS: FieldOption[] = [
  { value: 'new', label: 'New' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

export const FORM_FIELDS: FieldDef[] = [
  {
    name: 'fullName',
    label: 'Full Name',
    type: 'text',
    required: true,
    placeholder: 'Jane Doe',
    section: 'Personal Details',
    showInTable: true,
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    placeholder: 'jane@example.com',
    section: 'Personal Details',
    showInTable: true,
  },
  {
    name: 'phone',
    label: 'Phone',
    type: 'tel',
    required: true,
    placeholder: '+1 555 123 4567',
    helpText: 'Include country code where possible.',
    pattern: '^[+]?[0-9\\s()-]{6,20}$',
    patternMessage: 'Enter a valid phone number.',
    section: 'Personal Details',
    showInTable: true,
  },
  {
    name: 'dob',
    label: 'Date of Birth',
    type: 'date',
    required: true,
    section: 'Personal Details',
  },
  {
    name: 'gender',
    label: 'Gender',
    type: 'select',
    required: true,
    options: GENDER_OPTIONS,
    section: 'Personal Details',
  },
  {
    name: 'program',
    label: 'Program / Course',
    type: 'select',
    required: true,
    options: PROGRAM_OPTIONS,
    section: 'Enrollment',
    showInTable: true,
  },
  {
    name: 'source',
    label: 'How did you hear about us?',
    type: 'select',
    required: false,
    options: SOURCE_OPTIONS,
    section: 'Enrollment',
  },
  {
    name: 'address.line1',
    label: 'Address Line',
    type: 'text',
    required: false,
    placeholder: '123 Main St',
    section: 'Address',
  },
  {
    name: 'address.city',
    label: 'City',
    type: 'text',
    required: false,
    section: 'Address',
  },
  {
    name: 'address.state',
    label: 'State / Province',
    type: 'text',
    required: false,
    section: 'Address',
  },
  {
    name: 'address.zip',
    label: 'ZIP / Postal Code',
    type: 'text',
    required: false,
    pattern: '^[A-Za-z0-9\\s-]{3,12}$',
    patternMessage: 'Enter a valid postal code.',
    section: 'Address',
  },
];

/** Ordered list of section names, preserving first-seen order. */
export const FORM_SECTIONS: string[] = FORM_FIELDS.reduce<string[]>((acc, f) => {
  const s = f.section ?? 'Details';
  if (!acc.includes(s)) acc.push(s);
  return acc;
}, []);

/** Convenience lookup of a field's human label by its name. */
export const labelFor = (name: string): string =>
  FORM_FIELDS.find((f) => f.name === name)?.label ?? name;
