# Project Documentation — Multi-Hospital Healthcare Management System

**Team 16** · PES2UG24CS187 Harshith Manish · PES2UG24CS188 Harshith R Reddy

---

## 1. Problem statement
Healthcare providers operating across multiple hospitals struggle with fragmented
records spread over departments and sites. The Multi-Hospital Healthcare Management
System is a centralized, database-driven application that manages hospitals,
departments, doctors, nurses, staff, patients, appointments, admissions, beds,
prescriptions, medicines, laboratory tests, medical reports, insurance and payments,
while enforcing integrity and role-based access.

## 2. Objectives
- Centralize healthcare data for multiple hospitals under one schema.
- Enforce data integrity via primary keys, foreign keys, constraints and validation.
- Provide role-based access for Admins, Doctors and Patients.
- Demonstrate relational concepts: joins, aggregation, views, triggers, stored
  procedures, transactions and indexing.
- Combine relational and document databases, each justified by the data it stores.
- Deliver a functional Next.js web interface integrated with both databases.

## 3. Scope
**In scope:** registration and management of the entities above; appointment booking;
admissions with automatic bed management; prescriptions with stock control; lab tests
and reports; billing with insurance; role-based dashboards; document storage of
variable-structure clinical records.
**Out of scope:** real payment-gateway integration, telemedicine/video, and
production-grade deployment/scaling.

## 4. Functional requirements
| Role | Capabilities |
|------|-------------|
| **Admin** | Manage patients, doctors (with login accounts), departments, staff, nurses and beds; admit/discharge patients; record payments with insurance-cover validation; manage policies; monitor dashboards, audit activity and analytics |
| **Doctor** | View only assigned patients; open full records; prescribe medicines; order lab tests and enter results; write clinical notes; update appointment status; admit, update diagnosis and discharge own in-patients |
| **Patient** | Self-register; search doctors; book and cancel appointments; view medical history, prescriptions, lab reports, clinical notes, billing and insurance |

**Pages:** Login · Register · Dashboard (per role) · Patients · Patient record · Doctors · Hospitals · Appointments · Admissions · Beds · Billing · Analytics.

**Where each database feature appears in the app**

| Feature | Used by |
|---------|---------|
| `vw_patient_appointments`, `vw_patient_billing`, `vw_bed_availability` | Patient record, Billing, Beds pages |
| `trg_after_admission_insert` / `_update` | Admit → bed Occupied; Discharge → bed Available |
| `trg_before_prescmed_insert` | Prescribe form — blocks and rolls back the whole prescription if stock is short |
| `sp_book_appointment` (rejects past dates) | Every booking |
| `sp_discharge_patient` | Discharge button |
| `fn_patient_age`, `fn_outstanding_balance` | Patients list, record page, dashboards, billing |
| CHECK constraints | Insurance dates/cover, durations, statuses — DB errors shown to the user |
| Transactions + `SELECT … FOR UPDATE` | Registration, prescriptions, admissions (bed lock), lab results, insurance claims, doctor onboarding |
| MongoDB `medical_reports`, `clinical_notes` | Record page (variable-structure rendering), lab-result entry, clinical notes |
| MongoDB `audit_logs` + aggregation | Every write is logged; Admin dashboard feed; Analytics page |

## 5. Database design
- **ER diagram:** see `16_Diagrams.pdf` (ER Diagram section).
- **Relational schema:** see `16_Diagrams.pdf` (Relational Schema section) and
  `database/mysql/01_schema.sql`.
- 17 relational entities + `App_User` for authentication; one multivalued attribute
  table (`Emergency_Contact`); M:N resolved by `Prescription_Medicine`; 1:1 between
  `Lab_Test` and `Lab_Report`.

## 6. Database choice & justification
| Data | Database | Why |
|------|----------|-----|
| Hospitals, departments, doctors, patients, appointments, admissions, beds, prescriptions, insurance, payments, users | **MySQL** | Highly structured; requires foreign keys, constraints and transactions for integrity |
| Medical reports, clinical notes, audit logs | **MongoDB** | Semi-structured; fields vary per record type (a blood panel, an X-ray and an MRI differ) and do not fit fixed columns |

A blood-test report carries a nested `analytes[]` array; a radiology report carries
`findings`/`images[]`; an MRI carries `sequences[]`. A single relational table cannot
represent all three without sparse columns — this is the justification for the
document store. Full detail in `MongoDB_Design.md`.

## 7. Implementation summary
- **DDL** (`01_schema.sql`): 18 tables, PK/FK, CHECK & UNIQUE constraints, 8 indexes.
- **DML** (`02_seed.sql`): realistic sample data across all tables.
- **Views** (`03_views.sql`): patient appointments, bed availability, billing summary, admission details.
- **Triggers** (`04_triggers.sql`): auto-occupy bed on admission, free bed on discharge, block/decrement medicine stock.
- **Procedures & functions** (`05_procedures.sql`): `sp_book_appointment`, `sp_discharge_patient`, `fn_patient_age`, `fn_outstanding_balance`.
- **Transactions** (`06_transactions.sql`): atomic admit+bill, with a COMMIT and a ROLLBACK example.
- **MongoDB** (`database/mongodb/`): 3 collections, indexes, 5 aggregation pipelines.
- **Web app** (`app/`): Next.js App Router, JWT+bcrypt auth, row-level access (doctors see only assigned patients, patients only themselves), 23 API routes, forms, server-side search and filters, role dashboards, analytics.
- **ALTER and DELETE** (`09_alter_and_delete.sql`): `ALTER TABLE` adds columns (`Consultation_Fee`, `Reorder_Level`), a CHECK constraint and indexes, and widens a column; `UPDATE` and `DELETE` show conditional deletes and `ON DELETE CASCADE` (deleting a patient removes their contacts and appointments). Deleting a doctor with appointments fails by design (`ON DELETE RESTRICT`).
- **Data repair** (`08_fix_bed_status.sql`): marks beds with an active admission as Occupied (fixes a seed-order issue where Admission 1 was inserted before the triggers existed).

## 8. Important queries
See `database/mysql/07_queries.sql` for the full set. Highlights:
- 4-table INNER JOIN (appointments with doctor + department)
- GROUP BY + HAVING (doctors with more than one appointment)
- Scalar subquery (patients older than the average age)
- Correlated subquery with EXISTS (patients with pending payments)
- IN subquery (medicines currently prescribed)
- LEFT JOIN gap analysis (patients without insurance)
- CASE aggregation (bed utilisation per hospital)

## 9. System architecture

```
   Browser (React UI)
        │  fetch()
        ▼
  Next.js App Router ──────────────┐
   - Server Components (SSR)        │  parameterised SQL (mysql2)
   - API Route Handlers  ───────────┼───────────────► MySQL  (structured data)
   - middleware (route guard)       │
   - JWT (httpOnly cookie) + bcrypt │  driver (mongodb)
                                    └───────────────► MongoDB (clinical documents)
```
Credentials are read from environment variables; no secrets in source.

## 10. Testing results

The database scripts and the application were executed and verified end-to-end.

**SQL — all files load without error** (MariaDB 10.11):
```
01_schema.sql : OK      05_procedures.sql : OK
02_seed.sql   : OK      06_transactions.sql: OK
03_views.sql  : OK      07_queries.sql     : OK
04_triggers.sql: OK
```

**Trigger behaviour verified:**
- Admitting a patient flips the bed to `Occupied`; discharging frees it (`Available`).
- Inserting a prescription line beyond stock raises
  `ERROR 1644 (45000): Insufficient medicine stock for this prescription`.

**Stored function verified:**
```
fn_patient_age:  Rajesh Reddy=36, Priya Sharma=40, Amit Verma=25, Sneha Iyer=48, Vikram Singh=31
```

**Application API tests (live, against the running app):**
| Test | Expected | Result |
|------|----------|--------|
| Login `admin`/`Admin@123` | 200 + session cookie | ✅ 200, httpOnly cookie set |
| Login wrong password | 401 | ✅ 401 |
| Admin dashboard stats | live counts | ✅ patients 5, doctors 7, beds_free 4 |
| Patient search `?q=priya` | 1 match | ✅ Priya Sharma |
| Patient → `/api/patients` | 403 (RBAC) | ✅ 403 |
| Patient appointments | only own (patient 1) | ✅ scoped correctly |
| Patient books appointment | 200 (transaction) | ✅ created |
| Book past-dated appointment | 400 | ✅ 400 |
| Unauthenticated dashboard | 401 | ✅ 401 |
| Prescribe within stock | stock decremented by trigger | ✅ 500 → 490 |
| Prescribe 2 lines, 2nd exceeds stock | whole Rx rolled back | ✅ error shown; no Rx saved; 1st line's stock restored |
| Doctor prescribes for unassigned patient | 403 | ✅ 403 |
| Enter lab result | Lab_Report + status Completed + Mongo doc | ✅ all three written; repeat → 409 |
| Clinical note | saved to MongoDB, shown on record | ✅ |
| Admit with deposit | bed Occupied (trigger) + payment row | ✅ |
| Admit into occupied bed / already-admitted patient | 409 | ✅ 409 / 409 |
| Non-admitting doctor discharges | 403 | ✅ 403 |
| Discharge (sp_discharge_patient) | Discharged + bed Available | ✅ |
| Duplicate bed number in hospital | 409 (UNIQUE) | ✅ |
| Insurance claim above remaining cover | 400 | ✅ "₹1,98,800 left" |
| Claim on another patient's policy | 400 | ✅ |
| Policy with end date before start | rejected by CHECK | ✅ |
| Book via sp_book_appointment / past date | created / procedure SIGNAL | ✅ / ✅ 400 |
| Double-book a doctor's slot | 409 | ✅ |
| Patient self-registration | Patient + bcrypt login, logged in | ✅; duplicate phone leaves no partial rows |
| Admin adds doctor with login | doctor can log in | ✅ |
| Duplicate department in a hospital | 409 (UNIQUE) | ✅ |
| Writes recorded in audit_logs | yes | ✅ |
| All 17 pages render per role; cross-role pages redirect | ✅ | ✅ |

Screenshots: `docs/screenshots/` (login, admin dashboard, patients, appointments).

> **Note for submission:** these screenshots were captured from a reference run. Run the
> app on your own machine and re-capture screenshots for each role (Admin, Doctor,
> Patient) to include in the final report.

## 11. Conclusion
The project delivers a working multi-database healthcare system that demonstrates
relational design, advanced SQL features, a justified document store, and a role-based
Next.js interface integrated with both databases — going well beyond basic CRUD.

## 12. Future enhancements
- Vector search (pgvector/Chroma) over medical-report text for "similar case" retrieval.
- Real payment-gateway and insurance-claim workflow.
- Notifications (email/SMS) for appointment reminders.
- Audit-log viewer UI and analytics dashboards.
- Pagination and server-side filtering for large datasets.
