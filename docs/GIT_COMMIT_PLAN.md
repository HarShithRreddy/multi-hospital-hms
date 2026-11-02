# Git history and file ownership

Work is divided **by file**: every file has one owner, and each member committed
and pushed their own files from their own GitHub account.
See the contributions table in the README for the summary.

## Harshith R Reddy (PES2UG24CS188)

| # | Commit | Files |
|---|--------|-------|
| 1 | Next.js project setup | `package.json`, `package-lock.json`, `next.config.js`, `jsconfig.json`, `.gitignore`, `.env.example` |
| 2 | Sample data (DML) | `database/mysql/02_seed.sql` |
| 3 | Triggers | `database/mysql/04_triggers.sql` |
| 4 | Transactions | `database/mysql/06_transactions.sql` |
| 5 | Complex query showcase | `database/mysql/07_queries.sql` |
| 6 | MongoDB aggregation pipelines | `database/mongodb/02_mongo_queries.js` |
| 7 | MySQL pool, JWT auth, RBAC, login/register | `lib/mysql.js`, `lib/auth.js`, `lib/http.js`, `lib/access.js`, `middleware.js`, `app/api/auth/*`, `app/login`, `app/register`, `scripts/` |
| 8 | Layout, UI components, dashboards | `app/layout.js`, `app/page.js`, `app/globals.css`, `app/components/*`, `app/dashboard`, `app/api/dashboard`, `app/records` |
| 9 | Patients and medical records | `app/patients/**`, `app/api/patients`, `app/api/prescriptions`, `app/api/lab-tests/**`, `app/api/notes`, `app/api/reports/**` |
| 10 | Data dictionary, documentation, README | `docs/DATA_DICTIONARY.md`, `docs/DOCUMENTATION.md`, `README.md` |

## Harshith Manish (PES2UG24CS187)

| # | Commit | Files |
|---|--------|-------|
| 11 | Relational schema (DDL) + ER/schema diagrams | `database/mysql/01_schema.sql`, `docs/ER_and_Schema_Diagrams.pdf` |
| 12 | Views | `database/mysql/03_views.sql` |
| 13 | Stored procedures and functions | `database/mysql/05_procedures.sql` |
| 14 | Bed status repair script | `database/mysql/08_fix_bed_status.sql` |
| 15 | MongoDB collections, indexes, design doc | `database/mongodb/01_mongo_seed.js`, `docs/MongoDB_Design.md` |
| 16 | MongoDB client, audit log, formatting helpers | `lib/mongodb.js`, `lib/audit.js`, `lib/format.js` |
| 17 | Appointments via `sp_book_appointment` | `app/appointments/**`, `app/api/appointments/**` |
| 18 | Doctors and hospitals management | `app/doctors/**`, `app/hospitals/**`, `app/api/doctors`, `app/api/departments`, `app/api/staff` |
| 19 | Admissions and beds | `app/admissions/**`, `app/beds/**`, `app/api/admissions/**`, `app/api/beds/**` |
| 20 | Billing and insurance | `app/billing/**`, `app/api/payments/**`, `app/api/insurance` |
| 21 | Analytics | `app/analytics/**` |
| 22 | Screenshots and this commit plan | `docs/screenshots/*`, `docs/GIT_COMMIT_PLAN.md` |

The app needs both members' files to run, so build from the latest `main`.
`.env.local` (real credentials) is git-ignored and never committed.
