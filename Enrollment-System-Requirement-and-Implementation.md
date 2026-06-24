# Web-Based Enrollment System — Requirement & Implementation Document

**Project:** Enrollment Data Collection & Reporting Web Application
**Prepared by:** ZIVARA Corporation Private Limited
**Date:** 11 June 2026
**Version:** 1.0 (Draft — pending client clarifications)

---

## 1. Project Overview

The client requires a web-based application with two core capabilities:

1. **Collect enrollment information** from end users through an online form.
2. **Consolidate all submissions** into an easy-to-read report for the client/admin.

The client's job posting tags Java, PHP, JavaScript, and Firebase (Firestore / Realtime Database). The Firebase tags indicate openness to a serverless approach. We will propose a **React + Firebase (Firestore)** stack — fastest to deliver, zero server cost, and fully matching the client's tagged technologies.

---

## 2. Scope of Work

### In Scope
- Public-facing enrollment form (responsive, mobile-first)
- Client-side and server-rule validation
- Data storage in Firebase Cloud Firestore
- Admin dashboard with:
  - Tabular view of all enrollments (search, sort, filter, pagination)
  - Summary statistics (total enrollments, breakdown by category/date)
  - Export to CSV/Excel (and optionally PDF)
- Admin authentication (email/password via Firebase Auth)
- Deployment to Firebase Hosting with custom domain support
- Basic confirmation message/email on successful enrollment (if confirmed by client)

### Out of Scope (unless client adds budget)
- Payment collection
- Multi-language UI
- Native mobile apps
- Integration with external CRMs/ERPs
- Bulk import of legacy data

---

## 3. Functional Requirements

### FR-1: Enrollment Form (Public User)
| ID | Requirement |
|----|-------------|
| FR-1.1 | User can open the enrollment form via a public URL without login (assumption — to confirm with client). |
| FR-1.2 | Form captures enrollment fields. **Placeholder field set until client confirms:** Full Name, Email, Phone, Date of Birth, Gender, Program/Course Selected, Address, How did you hear about us. |
| FR-1.3 | All mandatory fields validated client-side (required, email format, phone format, date validity). |
| FR-1.4 | Duplicate prevention: warn/block if same email or phone has already enrolled (configurable). |
| FR-1.5 | On submit, record is written to Firestore with server timestamp and a unique enrollment ID (e.g., ENR-2026-00001). |
| FR-1.6 | User sees a success screen with their enrollment reference number. |
| FR-1.7 | (Optional) Confirmation email sent to the user via Firebase Extension (Trigger Email) — confirm with client. |
| FR-1.8 | (Optional) File upload (photo / ID proof) to Firebase Storage — confirm with client; affects effort. |

### FR-2: Admin Dashboard (Client/Admin User)
| ID | Requirement |
|----|-------------|
| FR-2.1 | Admin logs in via email/password (Firebase Authentication). No public access to data. |
| FR-2.2 | Dashboard home shows summary cards: Total Enrollments, Enrollments Today, Enrollments This Week/Month, Breakdown by Program. |
| FR-2.3 | Enrollment table view: paginated list with columns for all key fields. |
| FR-2.4 | Search by name/email/phone; filter by program, date range, status. |
| FR-2.5 | Sort by any column (date, name, program). |
| FR-2.6 | Click a row to view full enrollment detail. |
| FR-2.7 | Export filtered results to CSV/Excel (SheetJS). Optional: PDF export. |
| FR-2.8 | Simple charts: enrollments over time (line), enrollments by program (bar/pie) — Recharts. |
| FR-2.9 | (Optional) Mark enrollment status: New / Verified / Rejected — confirm with client. |

### FR-3: Non-Functional Requirements
| ID | Requirement |
|----|-------------|
| NFR-1 | Responsive UI — must work on mobile, tablet, desktop. |
| NFR-2 | Page load under 3 seconds on 4G. |
| NFR-3 | Data secured by Firestore Security Rules: public can only CREATE enrollments; only authenticated admin can READ/UPDATE. |
| NFR-4 | HTTPS enforced (default on Firebase Hosting). |
| NFR-5 | Handle at least 10,000 enrollment records without performance degradation (Firestore pagination). |
| NFR-6 | All timestamps stored in UTC, displayed in client's local timezone. |

---

## 4. Open Questions for Client (MUST clarify before development freeze)

1. **Domain:** What is the enrollment for — course, event, membership, school? This finalizes the field list.
2. **Fields:** Exact list of fields, which are mandatory, any file uploads?
3. **Report definition:** Is an on-screen dashboard + Excel export sufficient, or do they want PDF/email reports?
4. **Admin users:** How many admins? Single shared login or multiple accounts?
5. **Notifications:** Should the user receive a confirmation email? Should the admin be notified of new enrollments?
6. **Volume:** Expected number of enrollments (affects Firebase pricing tier — likely free tier is enough).
7. **Branding:** Logo, color scheme, existing website to match?
8. **Duplicates:** Allow multiple enrollments per person or block?

> **Note to team:** Build with the placeholder field set; keep the form schema config-driven (single JSON/TS config file) so field changes after client answers take minutes, not hours.

---

## 5. Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React 18 + Vite | Fast build, team expertise, modern tooling |
| UI/Styling | Tailwind CSS | Rapid responsive styling |
| Forms | React Hook Form + Zod | Declarative validation |
| Database | Firebase Cloud Firestore | Serverless, matches client tags, free tier sufficient |
| Auth | Firebase Authentication (email/password) | Built-in, secure admin login |
| File storage (if needed) | Firebase Storage | For uploads |
| Charts | Recharts | Dashboard graphs |
| Export | SheetJS (xlsx), jsPDF (optional) | CSV/Excel/PDF export |
| Hosting | Firebase Hosting | Free SSL, CDN, custom domain |
| Email (optional) | Firebase "Trigger Email" Extension + SMTP | Confirmation emails |

**No traditional backend server is required.** The browser talks directly to Firestore; security is enforced by Firestore Security Rules. This eliminates server cost and maintenance for the client.

---

## 6. Architecture

```
┌─────────────────────┐
│   Public User        │
│   (Browser/Mobile)   │
└─────────┬───────────┘
          │ HTTPS
          ▼
┌──────────────────────────────┐
│  Firebase Hosting (CDN+SSL)  │
│  React SPA                    │
│  ┌──────────┐ ┌────────────┐ │
│  │ /enroll   │ │ /admin     │ │
│  │ (public)  │ │ (auth only)│ │
│  └────┬─────┘ └─────┬──────┘ │
└───────┼─────────────┼────────┘
        │ create only │ read/update (auth)
        ▼             ▼
┌──────────────────────────────┐
│  Cloud Firestore              │
│  collection: enrollments      │
│  collection: meta (counters)  │
├──────────────────────────────┤
│  Firebase Auth (admin users)  │
│  Firebase Storage (uploads)*  │
│  Trigger Email Extension*     │
└──────────────────────────────┘
        * optional, pending client confirmation
```

---

## 7. Data Model (Firestore)

### Collection: `enrollments`
```json
{
  "enrollmentId": "ENR-2026-00042",
  "fullName": "string",
  "email": "string (lowercase)",
  "phone": "string (E.164)",
  "dob": "YYYY-MM-DD",
  "gender": "male | female | other",
  "program": "string (from configured list)",
  "address": { "line1": "", "city": "", "state": "", "zip": "" },
  "source": "string (how heard about us)",
  "status": "new | verified | rejected",
  "createdAt": "Firestore serverTimestamp",
  "createdDate": "YYYY-MM-DD (for range queries)",
  "emailLower_phone": "composite duplicate-check key"
}
```

### Collection: `meta`
```json
// doc: counters
{ "enrollmentSeq": 42, "year": 2026 }
```

### Collection: `admins`
```json
// doc id = Firebase Auth UID
{ "email": "admin@client.com", "role": "admin", "active": true }
```

### Firestore Security Rules (core logic)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    match /enrollments/{id} {
      allow create: if request.resource.data.keys().hasAll(
          ['fullName','email','phone','program','createdAt'])
        && request.resource.data.fullName is string
        && request.resource.data.email.matches('.+@.+\\..+');
      allow read, update, delete: if isAdmin();
    }

    match /admins/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false; // managed via console only
    }

    match /meta/{doc} {
      allow read, write: if isAdmin();
    }
  }
}
```
> Sequence numbering for `enrollmentId` is generated client-side via a Firestore transaction on `meta/counters` (or simplified to timestamp-based IDs if the client doesn't need sequential numbers — confirm).

---

## 8. Application Structure (React + Vite)

```
enrollment-app/
├── src/
│   ├── config/
│   │   └── formSchema.ts        # ← single source of truth for form fields
│   ├── lib/
│   │   ├── firebase.ts          # Firebase init
│   │   └── export.ts            # CSV/Excel export helpers
│   ├── pages/
│   │   ├── EnrollPage.tsx       # public form
│   │   ├── SuccessPage.tsx
│   │   └── admin/
│   │       ├── LoginPage.tsx
│   │       ├── DashboardPage.tsx   # summary cards + charts
│   │       ├── EnrollmentsPage.tsx # table, search, filter, export
│   │       └── EnrollmentDetail.tsx
│   ├── components/
│   │   ├── FormField.tsx        # renders field from schema config
│   │   ├── StatCard.tsx
│   │   ├── DataTable.tsx
│   │   └── Charts.tsx
│   ├── hooks/
│   │   ├── useEnrollments.ts    # paginated Firestore queries
│   │   └── useAuth.ts
│   ├── App.tsx                  # routes + auth guard
│   └── main.tsx
├── firestore.rules
├── firebase.json
└── package.json
```

**Key design decision — config-driven form:** `formSchema.ts` defines every field (name, label, type, validation, options). The form renders from this config. When the client finalizes fields, we change one file.

---

## 9. Implementation Plan — Task Breakdown

### Phase 0 — Setup (0.5 day) — *Owner: Lead*
- [ ] Create Firebase project; enable Firestore, Auth, Hosting
- [ ] Scaffold React + Vite + Tailwind project; install dependencies
- [ ] Configure Firebase SDK, environment variables
- [ ] Set up Git repo, branch strategy (main / dev)
- [ ] Deploy "hello world" to Firebase Hosting to validate pipeline

### Phase 1 — Enrollment Form (1 day) — *Owner: Frontend dev*
- [ ] Implement `formSchema.ts` with placeholder fields
- [ ] Build `EnrollPage` rendering from schema (React Hook Form + Zod)
- [ ] Client-side validation, error messages
- [ ] Firestore write with serverTimestamp + transaction-based enrollment ID
- [ ] Duplicate check (query by email/phone before write)
- [ ] Success page with reference number
- [ ] Responsive/mobile styling

### Phase 2 — Admin Auth & Dashboard (1 day) — *Owner: Frontend dev*
- [ ] Firebase Auth login page; auth guard on /admin routes
- [ ] Create admin user(s); seed `admins` collection
- [ ] Dashboard summary cards (total, today, week, by program)
- [ ] Charts: enrollments over time, by program (Recharts)

### Phase 3 — Enrollment Table & Export (1 day) — *Owner: Frontend dev*
- [ ] Paginated Firestore query hook (cursor-based, 25/page)
- [ ] DataTable: sort, search (name/email/phone), filter (program, date range, status)
- [ ] Row detail view; status update action (if confirmed)
- [ ] CSV/Excel export of filtered results (SheetJS)
- [ ] (Optional) PDF export

### Phase 4 — Security, Polish, Deploy (0.5–1 day) — *Owner: Lead*
- [ ] Finalize and deploy Firestore Security Rules; test with rules emulator
- [ ] Negative testing: unauthenticated read attempts must fail
- [ ] Cross-browser/mobile testing
- [ ] Lighthouse pass (performance/accessibility)
- [ ] Deploy to production Hosting; connect custom domain if client provides
- [ ] (Optional) Trigger Email extension for confirmations

### Phase 5 — Client UAT & Handover (1–2 days, calendar)
- [ ] Demo to client; collect feedback
- [ ] Apply field/label/branding changes (config-driven — fast)
- [ ] Handover document: admin login guide, how to export reports, Firebase console access transfer
- [ ] Final delivery & sign-off

---

## 10. Timeline & Effort Summary

| Phase | Effort | Calendar |
|-------|--------|----------|
| Phase 0 — Setup | 0.5 day | Day 1 |
| Phase 1 — Enrollment Form | 1 day | Day 1–2 |
| Phase 2 — Admin Auth & Dashboard | 1 day | Day 2–3 |
| Phase 3 — Table & Export | 1 day | Day 3–4 |
| Phase 4 — Security & Deploy | 0.5–1 day | Day 4–5 |
| Phase 5 — UAT & Handover | client-dependent | Day 5–7 |
| **Total build effort** | **~4–4.5 dev-days** | **Quote 5–7 calendar days** |

---

## 11. Testing Checklist

- [ ] Form validation: each field's required/format rules
- [ ] Duplicate submission blocked (same email/phone)
- [ ] Enrollment ID uniqueness under concurrent submissions
- [ ] Security: anonymous user CANNOT read enrollments (rules test)
- [ ] Security: anonymous user CANNOT write to admins/meta
- [ ] Admin login: wrong password, session persistence, logout
- [ ] Table: pagination at >100 records (seed test data)
- [ ] Filters and search return correct results
- [ ] Export file opens correctly in Excel; matches filtered view
- [ ] Mobile rendering: form and dashboard on 360px width
- [ ] Timezone correctness of displayed dates

---

## 12. Deliverables

1. Live public enrollment form URL
2. Live admin dashboard URL with credentials
3. Source code repository (full handover)
4. Firestore security rules deployed and documented
5. Admin user guide (1–2 pages: login, view, filter, export)
6. Firebase project ownership transfer to client (or managed under our account per agreement)

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Client field requirements change late | Config-driven form schema — changes take minutes |
| Vague "report" expectation | Show dashboard mock/demo early (Phase 2 end) for feedback |
| File uploads added mid-project | Quote as change request; Firebase Storage ready to enable |
| Firestore free-tier limits exceeded | 50K reads/20K writes per day free — far above expected volume; monitor in console |
| Client wants PHP/Java instead | Confirm stack approval in writing before Phase 0 |

---

*Prepared by ZIVARA Corporation Private Limited — for internal team distribution.*
