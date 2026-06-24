# Admin User Guide — Enrollment System

A short guide for administrators. (Deliverable #5.)

## 1. Signing in

1. Go to the admin URL: `https://<your-site>/admin/login`
   (locally: `http://localhost:3000/admin/login`).
2. Enter the **email** and **password** provided to you.
3. Click **Sign In**. You'll land on the **Dashboard**.

> Forgot your password or need another admin account? Contact your Firebase
> project owner — admin accounts are created in the Firebase console.

To sign out, click **Sign out** (top-right).

## 2. Dashboard

The dashboard shows at-a-glance numbers and charts:

- **Total Enrollments**, **Today**, **This Week**, **This Month** cards.
- **Enrollments Over Time** (line chart, last 30 active days).
- **Enrollments by Program** (bar chart) and **Program Share** (pie chart).

## 3. Viewing enrollments

Click **Enrollments** in the top nav.

- **Search** — type a name, email, phone, or enrollment ID. Results filter as
  you type.
- **Program / Status** — narrow the list to one program or status.
- **From / To** — limit to a submission date range.
- **Reset** — clears all filters.
- **Sort** — click any column header (ID, Name, Email, Program, Status,
  Submitted) to sort; click again to reverse.
- **Pagination** — use **Prev / Next** at the bottom (25 per page).

Click any **row** to open the full enrollment detail.

## 4. Enrollment detail & status

On a record's detail page you can see every submitted field and change the
**Status**:

- **New** — just submitted (default).
- **Verified** — reviewed and accepted.
- **Rejected** — declined.

Pick a status from the dropdown; it saves immediately.

## 5. Exporting reports

On the **Enrollments** page:

- **Export Excel** — downloads an `.xlsx` of all records matching the current
  filters.
- **Export CSV** — same data as `.csv`.

The export respects your active search/filter — set the filters first, then
export. The file name includes the date and time.

## 6. Tips

- Dates are stored in UTC and shown in your local timezone.
- Duplicate prevention: if enabled, a second enrollment with the same email or
  phone is blocked at submission.
- All data lives in your Firebase project; only signed-in admins can read it.
