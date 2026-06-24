# Enrollment System — Deployment Record

**App:** `enrolment_system/enrollment-app` (React 19 + Vite + TypeScript + Firebase)
**Deployed:** 2026-06-12
**Live URL:** http://enrolment.mystartime.com
**Purpose:** Live demo for an Upwork client proposal (enrollment data collection + reporting).

---

## 1. Where it runs

| | |
|---|---|
| Host | AWS EC2, Ubuntu 22.04, **`15.206.218.26`** (ap-south-1, shared with the `startime` app) |
| SSH | `ssh -i /home/siva/siva/projects/thd/Importants/AWS/startime-key.pem ubuntu@15.206.218.26` |
| Domain | `enrolment.mystartime.com` (GoDaddy DNS, nameservers `ns05/ns06.domaincontrol.com`) — A record → `15.206.218.26` |
| Web server | nginx 1.18 (also serves the existing `mystartime.com` — left untouched) |
| Specs | 2 vCPU, 7.6 GB RAM, 7.6 GB disk (~2.7 GB free after install) |
| AWS Security Group | `launch-wizard-1` — open ports: 22, 80, 443 (no AWS console/CLI creds available locally) |

---

## 2. What the app is

- **Frontend:** Vite + React + TS, builds to static `dist/`. Tailwind, Recharts, SheetJS (Excel/CSV export).
- **Backend:** **Firebase Emulator Suite** (Firestore + Auth) — NOT a real Firebase project. Project id `demo-enrollment`. The app is configured with `VITE_USE_EMULATOR=true`; Vite inlines env at build time.
- **Features:** public enrollment form, admin login, dashboard (summary cards + charts), searchable/sortable/filterable/paginated enrollment table, Excel/CSV export, per-record status (New/Verified/Rejected).

---

## 3. Architecture history: Model A → Model B

The Firebase JS SDK **forces the Firestore emulator connection to plain HTTP** (`connectFirestoreEmulator` hard-codes `ssl:false`). That single fact drove every decision below.

### Model A (initial) — HTTPS + SSH tunnel — *superseded*
- App over HTTPS; emulator bound to `127.0.0.1` only (never public).
- Browsers reached the emulator via an SSH tunnel (`127.0.0.1` is exempt from mixed-content blocking).
- **Failed requirement:** phones can't run an SSH tunnel → mobile users couldn't sign in.
- Original nginx config preserved at `/etc/nginx/sites-available/enrolment.modelA.bak`.

### Model B (current) — public HTTP via nginx proxy
- App + emulator served over **public HTTP on port 80** (already open; no AWS firewall change needed).
- Emulator stays bound to `127.0.0.1`; **nginx reverse-proxies** the emulator paths to it.
- App build points the emulator host at `enrolment.mystartime.com:80` (see `.env.production.local`).
- HTTPS/443 **301-redirects to HTTP** (so nobody hits the mixed-content-broken HTTPS version).
- **Works on all devices, no tunnel.**

```
Phone / Laptop ──HTTP:80──> nginx (enrolment.mystartime.com)
                              ├── /                          → static dist (React app)
                              ├── /identitytoolkit.googleapis.com/  → 127.0.0.1:9098 (Auth emulator)
                              ├── /securetoken.googleapis.com/      → 127.0.0.1:9098
                              ├── /emulator/                        → 127.0.0.1:9098
                              ├── /google.firestore.v1.Firestore/   → 127.0.0.1:8088 (Firestore emulator)
                              └── /v1/                              → 127.0.0.1:8088
```

---

## 4. Access

| | |
|---|---|
| Enrollment form (public) | http://enrolment.mystartime.com |
| Admin dashboard | http://enrolment.mystartime.com/admin/login |
| Admin login | `admin@enroll.test` / `admin123` (created by seed script) |
| Sample data | 40 enrollments seeded across last 30 days |

---

## 5. Files & services on the server

| Thing | Location |
|---|---|
| App static files | `/home/ubuntu/enrolment-ui/dist` |
| nginx site (active, Model B) | `/etc/nginx/sites-available/enrolment` (symlinked in `sites-enabled/`) |
| nginx site (Model A backup) | `/etc/nginx/sites-available/enrolment.modelA.bak` |
| nginx full backup | `/etc/nginx/sites-available.bak.<timestamp>/` |
| Emulator workspace | `/home/ubuntu/enrolment-emulator/` (`firebase.json`, `firestore.rules`, `firestore.indexes.json`, `start-emulator.sh`, `seed.mjs`) |
| Emulator persisted data | `/home/ubuntu/enrolment-emulator/emulator-data/` (auth_export + firestore_export) |
| Emulator service | systemd unit `enrolment-emulator` (`/etc/systemd/system/enrolment-emulator.service`) — auto-start on boot, auto-restart, `--export-on-exit`/`--import` persistence |
| SSL cert | `/etc/letsencrypt/live/enrolment.mystartime.com/` (Let's Encrypt, expires 2026-09-10, certbot auto-renew) |
| Toolchain installed | Node 20 (NodeSource) + firebase-tools 15.x (global), OpenJDK 21 (was already present) |

Emulator listens on `127.0.0.1:8088` (Firestore) and `127.0.0.1:9098` (Auth). Hub on `127.0.0.1:4400`.

---

## 6. Local build config

`enrollment-app/.env.production.local` (overrides `.env` for production builds — points emulator at the public host):
```
VITE_USE_EMULATOR=true
VITE_EMULATOR_HOST=enrolment.mystartime.com
VITE_FIRESTORE_EMULATOR_PORT=80
VITE_AUTH_EMULATOR_PORT=80
VITE_FIREBASE_PROJECT_ID=demo-enrollment
VITE_BLOCK_DUPLICATES=true
```
(The original dev `.env` still points at `127.0.0.1:8088/9098` for local emulator development.)

---

## 7. Common operations (runbook)

```bash
KEY=/home/siva/siva/projects/thd/Importants/AWS/startime-key.pem
HOST=ubuntu@15.206.218.26

# --- Redeploy the frontend after a code change ---
cd /home/siva/siva/projects/thd/SERVICE_PROJECTS/enrolment_system/enrollment-app
npm run build
scp -i "$KEY" -r dist/. $HOST:/home/ubuntu/enrolment-ui/dist/

# --- Emulator service control ---
ssh -i "$KEY" $HOST 'sudo systemctl restart enrolment-emulator'   # restart (re-imports saved data)
ssh -i "$KEY" $HOST 'systemctl status enrolment-emulator'         # status
ssh -i "$KEY" $HOST 'sudo journalctl -u enrolment-emulator -n 50' # logs

# --- Snapshot emulator data to disk on demand (durability) ---
ssh -i "$KEY" $HOST 'cd /home/ubuntu/enrolment-emulator && firebase emulators:export emulator-data --force --project demo-enrollment'

# --- Re-seed admin + sample data (ports 8088/9098) ---
ssh -i "$KEY" $HOST 'cd /home/ubuntu/enrolment-emulator && \
  FIRESTORE_EMULATOR_HOST=127.0.0.1:8088 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9098 \
  VITE_FIREBASE_PROJECT_ID=demo-enrollment node seed.mjs'

# --- nginx: always validate before reload ---
ssh -i "$KEY" $HOST 'sudo nginx -t && sudo systemctl reload nginx'

# --- Roll back to Model A (HTTPS + tunnel) ---
ssh -i "$KEY" $HOST 'sudo cp /etc/nginx/sites-available/enrolment.modelA.bak /etc/nginx/sites-available/enrolment && sudo nginx -t && sudo systemctl reload nginx'
# (then rebuild app with the original 127.0.0.1 .env and redeploy)
```

---

## 8. ⚠️ Security status (demo-grade — by design)

- The app, **admin login, and database are publicly reachable over plain HTTP** with no transport encryption.
- The admin password (`admin123`) is a **well-known demo credential** baked into the seed script.
- The backend is the **Firebase Emulator**, not production Firebase: data lives only in `emulator-data/` on the box (persisted on graceful stop / manual export; an unclean kill could lose the most recent writes). It is a dev/test tool, not a durable production datastore.
- **Acceptable only as a throwaway client demo.** Do NOT enter real personal data.

### Path to production (when the client signs)
1. Create a real **Firebase project** (free Spark tier).
2. Rebuild with `VITE_USE_EMULATOR=false` + real `VITE_FIREBASE_*` web config.
3. Add `enrolment.mystartime.com` to Firebase Auth **authorized domains**.
4. Restore HTTPS (the Let's Encrypt cert is still installed — just revert the 443→80 redirect).
   → Result: real auth security, persistent cloud DB, HTTPS, works on all devices with no proxy hack.

---

## 9. Deliverables produced this session

- Live demo (URLs above).
- Built `dist/` deployed to EC2.
- Firebase emulator running as a managed service with seeded data.
- Upwork **cover letter** (drafted; references this app + attached technical doc + screenshots).
- Existing technical doc: `enrollment-app/Enrollment-System-Requirement-and-Implementation.md` and `enrollment-app/docs/Enrollment-System-Documentation.pdf`.
- This deployment record.
