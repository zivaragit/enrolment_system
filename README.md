# Enrollment System

A web-based application for collecting enrollment information from end users and
consolidating all submissions into an easy-to-read admin report.

- **Public users** submit an enrollment form and receive a unique reference number.
- **Admins** sign in to a dashboard with summary stats, charts, a searchable /
  filterable / sortable table, row detail with status updates, and CSV/Excel export.

There is **no backend server** — the browser talks to Firestore directly and
security is enforced by Firestore Security Rules.

## Features

- **Public enrollment form** — responsive, mobile-first, with client-side and
  Firestore server-rule validation, duplicate prevention, and auto-generated
  enrollment reference IDs (e.g. `ENR-2026-00001`).
- **Admin dashboard** — tabular view of all enrollments with search, sort,
  filter, and pagination; summary statistics and charts; export to CSV/Excel.
- **Admin authentication** — email/password via Firebase Auth.
- **Serverless** — deployed to Firebase Hosting, backed by Cloud Firestore.

## Tech Stack

| Layer    | Technology                         |
|----------|------------------------------------|
| Frontend | React 18, Vite, TypeScript         |
| Styling  | Tailwind CSS                       |
| Forms    | React Hook Form + Zod              |
| Database | Firebase Cloud Firestore           |
| Auth     | Firebase Authentication (email/pw) |
| Charts   | Recharts                           |
| Export   | SheetJS (xlsx)                     |
| Hosting  | Firebase Hosting                   |

## Repository Layout

```
enrolment_system/
├── enrollment-app/      # React + Firebase application (see its README.md)
├── Enrollment-System-Requirement-and-Implementation.md
└── DEPLOYMENT_RECORD.md
```

See [`enrollment-app/README.md`](enrollment-app/README.md) for setup, local
development, build, and deployment instructions.

---

Built by ZIVARA Corporation Private Limited.
