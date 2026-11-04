# Multi-Hospital Healthcare Management System

**DBMS Experiential Learning – Level 3 Mini-Project · Team 16 · PES University (EC Campus)**

| SRN | Name |
|-----|------|
| PES2UG24CS187 | Harshith Manish |
| PES2UG24CS188 | Harshith R Reddy |

A centralized, database-driven system to manage healthcare services across multiple
hospitals and departments — hospitals, doctors, patients, appointments, admissions,
beds, prescriptions, lab tests, reports, insurance and payments — with role-based
access for Admins, Doctors and Patients.

It uses **two database paradigms**:
- **MySQL (relational)** — structured, transactional data with full referential integrity.
- **MongoDB (document)** — variable-structure clinical content (medical reports, clinical notes, audit logs).

---

## Features by role

| Role | What they can do |
|------|------------------|
| **Patient** | Self-register (patient + login in one transaction) · find doctors by name/specialization/hospital · book appointments (via `sp_book_appointment`) and cancel them · view full medical record: history, prescriptions, lab results, MongoDB reports & clinical notes, billing and insurance cover |
| **Doctor** | Dashboard with schedule and pending lab results · *My Patients* (only assigned patients) · prescribe multiple medicines (stock trigger, all-or-nothing transaction) · order lab tests and enter results (MySQL + MongoDB) · write clinical notes (MongoDB) · complete / no-show appointments · admit, update diagnosis, discharge own in-patients |
| **Admin** | Network dashboard with live audit feed · manage patients, doctors (with logins), departments, staff and nurses · admissions with locked bed allocation and deposit · bed management with filters and utilisation · billing with insurance-cover checks · analytics page running the complex SQL queries and MongoDB aggregations live |

Every write is recorded in the MongoDB `audit_logs` collection.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend + Backend | Next.js 14 (App Router, API Route Handlers) |
| Relational DB | MySQL 8 / MariaDB 10.4+ |
| Document DB | MongoDB |
| Auth | JWT in httpOnly cookie, bcrypt password hashing |
| DB drivers | mysql2, mongodb |

---

## Project structure

```
multi-hospital-hms/
├── database/
│   ├── mysql/        01_schema → 07_queries (DDL, seed, views, triggers, procs, transactions, queries)
│   └── mongodb/      01_mongo_seed.js, 02_mongo_queries.js
├── docs/             DOCUMENTATION.md, DATA_DICTIONARY.md, MongoDB_Design.md, screenshots/
├── lib/              mysql.js, mongodb.js, auth.js
├── app/              pages + api/ route handlers + components
├── middleware.js     route protection
├── scripts/          hash-password.js
├── .env.example      copy to .env.local
└── package.json
```

---

## Setup & run

### 1. Prerequisites
- Node.js 18+
- MySQL 8 (or MariaDB 10.4+) running
- MongoDB running (local, or a free MongoDB Atlas cluster)

### 2. Load the relational database
Run the SQL files **in order**:
```bash
mysql -u root -p < database/mysql/01_schema.sql
mysql -u root -p < database/mysql/02_seed.sql
mysql -u root -p < database/mysql/03_views.sql
mysql -u root -p < database/mysql/04_triggers.sql
mysql -u root -p < database/mysql/05_procedures.sql
# 06 and 07 are demonstrations you can run any time:
mysql -u root -p < database/mysql/06_transactions.sql
mysql -u root -p < database/mysql/07_queries.sql
# 08 repairs bed statuses if you loaded an older seed (safe to re-run):
mysql -u root -p < database/mysql/08_fix_bed_status.sql
# 09 demonstrates ALTER TABLE and DELETE (incl. ON DELETE CASCADE) — run once:
mysql -u root -p < database/mysql/09_alter_and_delete.sql
```

### 3. Load the document database
```bash
mongosh "<YOUR_MONGODB_URI>" database/mongodb/01_mongo_seed.js
mongosh "<YOUR_MONGODB_URI>" database/mongodb/02_mongo_queries.js   # demo queries
```

### 4. Configure environment
```bash
cp .env.example .env.local
# edit .env.local with your MySQL password, Mongo URI and a JWT secret
```

### 5. Install & start the app
```bash
npm install
npm run dev        # http://localhost:3000
```

---

## Demo logins

| Username | Password | Role |
|----------|----------|------|
| `admin` | `Admin@123` | Admin |
| `dr_mehta` | `Doctor@123` | Doctor (Dr. Rohit Mehta) |
| `dr_rao` | `Doctor@123` | Doctor (Dr. Suresh Rao) |
| `patient_rajesh` | `Patient@123` | Patient (Rajesh Reddy) |
| `patient_priya` | `Patient@123` | Patient (Priya Sharma) |

> Passwords are stored only as **bcrypt hashes** in `App_User`. The plaintext above is
> for local testing. To add a user, generate a hash with
> `node scripts/hash-password.js "YourPassword"` and insert it.

---

## Advanced database features (required: min 4)

| # | Feature | Where |
|---|---------|-------|
| 1 | **Views** | `03_views.sql` — used by the record, beds and billing pages |
| 2 | **Triggers** | `04_triggers.sql` — fire from the app on admit, discharge and prescribe |
| 3 | **Stored procedures & functions** | `05_procedures.sql` — booking calls `sp_book_appointment`, discharge calls `sp_discharge_patient`, pages use `fn_patient_age` / `fn_outstanding_balance` |
| 4 | **Transactions** | `06_transactions.sql` + app: registration, prescriptions, admissions, lab results, insurance claims |
| 5 | **Indexing** | in `01_schema.sql` (SQL) and `01_mongo_seed.js` (NoSQL) |
| 6 | **NoSQL aggregation** | `database/mongodb/02_mongo_queries.js` |

---

## Individual contributions

Work is split by file, and each member owns database work as well as app features.

| | Harshith Manish (PES2UG24CS187) | Harshith R Reddy (PES2UG24CS188) |
|---|---|---|
| **SQL** | `01_schema.sql` (DDL, keys, constraints, indexes) · `03_views.sql` · `05_procedures.sql` (procedures + functions) · `08_fix_bed_status.sql` | `02_seed.sql` (DML) · `04_triggers.sql` · `06_transactions.sql` · `07_queries.sql` (joins, GROUP BY/HAVING, subqueries) |
| **MongoDB** | `01_mongo_seed.js` (collections, indexes) · `docs/MongoDB_Design.md` | `02_mongo_queries.js` (aggregation pipelines) |
| **Design docs** | `docs/ER_and_Schema_Diagrams.pdf` | `docs/DATA_DICTIONARY.md` |
| **App** | `lib/mongodb.js`, `lib/audit.js`, `lib/format.js` · appointments · doctors · hospitals · admissions · beds · billing & insurance · analytics | project setup · `lib/mysql.js`, `lib/auth.js`, `lib/http.js`, `lib/access.js`, `middleware.js` · login/register · UI shell & dashboards · patients & medical records (prescriptions, lab tests, clinical notes) |
| **Docs** | `docs/screenshots/`, `docs/GIT_COMMIT_PLAN.md` | `README.md`, `docs/DOCUMENTATION.md` |

The commit history reflects this split.

---

## Security notes
- Passwords: bcrypt-hashed, never stored or logged in plaintext.
- DB credentials: environment variables only (`.env.local`, git-ignored).
- SQL injection: all queries use parameterised placeholders (`?`).
- Sessions: signed JWT in an httpOnly cookie; role checked server-side on every protected route.
