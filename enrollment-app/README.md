# Enrollment System

A web-based enrollment data-collection & reporting application.

- **Public users** submit an enrollment form and receive a reference number.
- **Admins** sign in to a dashboard with summary stats, charts, a searchable /
  filterable / sortable table, row detail with status updates, and CSV/Excel export.

Built per the requirement doc (`../Enrollment-System-Requirement-and-Implementation.md`)
with **React 18 + Vite + TypeScript + Tailwind CSS + Firebase (Firestore + Auth)**.
There is **no backend server** — the browser talks to Firestore directly and
security is enforced by Firestore Security Rules.

---

## Tech stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | React 18, Vite, TypeScript          |
| Styling      | Tailwind CSS                        |
| Forms        | React Hook Form + Zod               |
| Database     | Firebase Cloud Firestore            |
| Auth         | Firebase Authentication (email/pw)  |
| Charts       | Recharts                            |
| Export       | SheetJS (xlsx)                      |
| Hosting      | Firebase Hosting                    |

---

## Project layout

```
enrollment-app/
├── src/
│   ├── config/
│   │   ├── formSchema.ts      # ← SINGLE SOURCE OF TRUTH for form fields
│   │   └── validation.ts      # Zod schema built from formSchema
│   ├── lib/
│   │   ├── firebase.ts        # Firebase init (+ emulator wiring)
│   │   ├── enrollments.ts     # All Firestore reads/writes + stats
│   │   ├── export.ts          # CSV / Excel export (SheetJS)
│   │   └── format.ts          # Display + label helpers
│   ├── context/AuthContext.tsx
│   ├── hooks/useEnrollments.ts
│   ├── components/            # FormField, StatCard, DataTable, Charts, …
│   ├── pages/
│   │   ├── EnrollPage.tsx     # public form
│   │   ├── SuccessPage.tsx
│   │   └── admin/            # LoginPage, DashboardPage, EnrollmentsPage, …
│   ├── App.tsx               # routes + auth guard (admin code-split)
│   └── main.tsx
├── scripts/seed.mjs          # demo-data seeder (emulator)
├── firestore.rules           # security rules
├── firestore.indexes.json
├── firebase.json
└── .env.example
```

### The config-driven form

`src/config/formSchema.ts` defines every field (name, label, type, validation,
options). The public form, the Zod validation, the table columns, and the export
all derive from it. **When the client finalises their fields, edit that one file**
— everything else adapts.

---

## Running locally

You have two options.

### Option A — Firebase Emulator (no real project needed) ✅ recommended for dev

Requires the Firebase CLI (`npm i -g firebase-tools`) and Java (for the Firestore
emulator).

```bash
npm install
cp .env.example .env          # then set VITE_USE_EMULATOR=true
npm run emulators             # terminal 1 — Auth:9099, Firestore:8080, UI:4000
npm run seed                  # terminal 2 — creates admin + 40 sample records
npm run dev                   # terminal 3 — app on http://localhost:3000
```

Sign in to the admin dashboard at `/admin/login` with:

```
admin@enroll.test  /  admin123
```

### Option B — Real Firebase project

1. Create a Firebase project; enable **Firestore**, **Authentication
   (Email/Password)**, and **Hosting**.
2. Copy the web app config into `.env` (see `.env.example`), keep
   `VITE_USE_EMULATOR=false`.
3. Create an admin user (Authentication → Add user), then add a doc in the
   `admins` collection with **document ID = that user's UID** and fields
   `{ email, role: "admin", active: true }`.
4. Deploy the rules and run:

```bash
firebase deploy --only firestore:rules,firestore:indexes
npm run dev
```

---

## Environment variables

See `.env.example`. Key ones:

| Var                     | Purpose                                            |
|-------------------------|----------------------------------------------------|
| `VITE_FIREBASE_*`       | Firebase web app config                            |
| `VITE_USE_EMULATOR`     | `true` → use local emulators                       |
| `VITE_BLOCK_DUPLICATES` | `true` → block repeat email/phone (FR-1.4)         |

---

## Build & deploy

```bash
npm run build                 # type-check + production build to dist/
firebase deploy --only hosting
```

The build is code-split: the public enrollment form does **not** download the
admin-only chart/export libraries.

---

## Data model

### `enrollments/{autoId}`
```jsonc
{
  "enrollmentId": "ENR-2026-00042",   // human-readable, sequential
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "emailLower": "jane@example.com",
  "phone": "+15551234567",
  "dob": "1995-06-15",
  "gender": "female",
  "program": "web-development",
  "source": "social-media",
  "address": { "line1": "", "city": "", "state": "", "zip": "" },
  "status": "new",                     // new | verified | rejected
  "createdAt": "<serverTimestamp>",    // UTC
  "createdDate": "2026-06-11",         // for range queries
  "dupKey": "jane@example.com|+15551234567"
}
```

### `meta/counters`
```jsonc
{ "enrollmentSeq": 42, "year": 2026 }
```
Incremented inside a Firestore transaction to mint sequential enrollment IDs.

### `dupKeys/{email|phone:value}`
Public-creatable, no-PII markers used to block duplicate email/phone within the
enrollment transaction (existence check only; cannot be listed).

### `admins/{uid}`
```jsonc
{ "email": "admin@client.com", "role": "admin", "active": true }
```
Console-managed (rules forbid client writes).

---

## Security model (Firestore rules)

- **Public** users may **only** create enrollment docs (validated shape) and
  reserve dup-key markers. They cannot read any enrollment.
- **Admins** (signed-in users with an `admins/{uid}` doc) may read / update /
  delete enrollments and read `meta`.
- The sequence counter can only ever move forward by exactly one (`+1`).
- The `admins` collection is read-own-doc and write-forbidden from the client.

See `firestore.rules`.

---

## Testing & verification

Three checks ship with the project (run against the emulator):

```bash
npm run emulators        # terminal 1
npm run seed             # terminal 2 — admin + 40 records
npm run verify:rules     # security-rule + data-path tests (Firebase SDK)
npm run dev              # terminal 3 (with VITE_USE_EMULATOR=true)
npm run verify:e2e       # headless-browser UI test (needs system Chrome)
```

- `scripts/verify.mjs` — 8 assertions covering NFR-3 security rules: anonymous
  cannot read enrollments, can create only valid `status:"new"` docs, cannot
  touch `admins`, the counter only moves `+1`, and admins can read.
- `scripts/e2e.mjs` — drives the real UI with Puppeteer: submit the public form
  → sequential reference number, duplicate email blocked, admin login, dashboard
  totals, paginated table, search. Set `CHROME_PATH` if Chrome isn't at
  `/usr/bin/google-chrome`.

Both suites pass (8/8 rule tests, 7/7 UI tests) on this build.

> The Firestore emulator requires **Java** on the PATH.

## Requirement traceability

| Req         | Where                                                            |
|-------------|-----------------------------------------------------------------|
| FR-1.1–1.6  | `pages/EnrollPage.tsx`, `lib/enrollments.ts` (`createEnrollment`)|
| FR-1.3      | `config/validation.ts` (Zod, built from schema)                 |
| FR-1.4      | duplicate guard in `createEnrollment` + `dupKeys` rules         |
| FR-1.5      | sequential ID via `meta/counters` transaction                   |
| FR-2.1      | `context/AuthContext.tsx`, `components/ProtectedRoute.tsx`       |
| FR-2.2/2.8  | `pages/admin/DashboardPage.tsx`, `components/Charts.tsx`         |
| FR-2.3–2.6  | `pages/admin/EnrollmentsPage.tsx`, `hooks/useEnrollments.ts`    |
| FR-2.7      | `lib/export.ts` (CSV + Excel)                                   |
| FR-2.9      | status select in `pages/admin/EnrollmentDetail.tsx`             |
| NFR-3       | `firestore.rules`                                               |
| NFR-5       | cursor pagination + `getCountFromServer` aggregation            |
| NFR-6       | timestamps stored UTC, displayed local (`lib/format.ts`)        |

See `ADMIN_GUIDE.md` for the admin user guide.
```
