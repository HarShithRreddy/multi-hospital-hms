# MongoDB Component — Design & Justification
**Multi-Hospital Healthcare Management System · Team 16**
*(PES2UG24CS187 Harshith Manish · PES2UG24CS188 Harshith R Reddy)*

## 1. Why a second database, and why MongoDB

The rubric requires **minimum two database paradigms** and warns that the choice
must be justified by the *nature of the data*, not added for demonstration.

| Data type | Database | Reason |
|---|---|---|
| Hospitals, departments, doctors, patients, appointments, admissions, beds, prescriptions, insurance, payments | **MySQL (relational)** | Highly structured, needs foreign keys, constraints, transactions, referential integrity |
| Medical reports, clinical notes, audit logs | **MongoDB (document)** | Semi-structured; fields vary per case (a blood panel, an X-ray, and an MRI have different attributes) and do not fit fixed columns |

**One-line justification (for your report/viva):** *We use MySQL for structured
transactional data where integrity and relationships matter, and MongoDB for
variable-structure clinical documents whose schema differs from one report type
to the next — forcing these into fixed SQL columns would mean sparse tables or
one opaque TEXT blob.*

## 2. Collections

| Collection | Purpose | Links to MySQL via |
|---|---|---|
| `medical_reports` | Lab / diagnostic reports; structure varies by `report_type` | `patient_id`, `test_id`, `doctor_id` |
| `clinical_notes` | Doctor's per-visit consultation notes (nested vitals, symptom arrays) | `patient_id`, `doctor_id`, `appointment_id` |
| `audit_logs` | Append-only activity trail for role-based-access auditing | `user_id`, `user_role` |

> Linking is by **storing the MySQL integer IDs as fields** in each document.
> MySQL stays the source of truth for identities; MongoDB references them.

### Why document structure varies (the key point)
`medical_reports` deliberately holds three different shapes:
- **Blood Test** → nested `analytes[]` array (name, value, unit, ref range, flag)
- **Radiology** → `findings`, `impression`, `images[]`
- **MRI** → `sequences[]`, `contrast_used`

A single relational table cannot represent all three cleanly. This is the
justification examiners look for.

## 3. Indexes

| Collection | Index | Why |
|---|---|---|
| `medical_reports` | `{ patient_id: 1 }` | Fetch a patient's reports |
| `medical_reports` | `{ report_type: 1 }` | Filter/group by type |
| `clinical_notes` | `{ patient_id: 1, visit_date: -1 }` | Latest notes per patient |
| `audit_logs` | `{ ts: -1 }` | Recent-activity feed |
| `audit_logs` | `{ user_role: 1, action: 1 }` | Per-role action reports |

## 4. Advanced feature covered

`02_mongo_queries.js` demonstrates **NoSQL aggregation** — one of your required 4
advanced concepts. Pipelines include `$group`, `$match`, `$unwind` (querying inside
nested arrays), `$dateToString` grouping, and a `$lookup` join. Combine with 3
from the SQL side (e.g. Views, Triggers, Stored Procedures, Transactions) to meet
the minimum of 4.

## 5. Next.js integration

Credentials go in `.env.local` (**never** hard-coded — this is a graded requirement):

```
# .env.local  (add to .gitignore)
MONGODB_URI="mongodb://localhost:27017"
MONGODB_DB="MultiHospitalHealthcare"
```

A single shared client (`lib/mongodb.js`):

```js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export async function getDb() {
  const c = await clientPromise;
  return c.db(process.env.MONGODB_DB);
}
```

Example API route (`app/api/reports/[patientId]/route.js`):

```js
import { getDb } from "@/lib/mongodb";

export async function GET(_req, { params }) {
  const db = await getDb();
  const reports = await db
    .collection("medical_reports")
    .find({ patient_id: Number(params.patientId) })
    .sort({ report_date: -1 })
    .toArray();
  return Response.json(reports);
}
```

Install the driver: `npm install mongodb`

## 6. Setup — pick one

| Option | Steps | Best when |
|---|---|---|
| **MongoDB Atlas (cloud)** | Create free M0 cluster → copy connection string into `MONGODB_URI` → run seed | Easiest; nothing to install; good for demo from any machine |
| **Local MongoDB** | Install MongoDB Community + `mongosh` → start `mongod` → run seed | You want it fully offline |

**Load the data:**
```bash
mongosh "<YOUR_MONGODB_URI>" 01_mongo_seed.js
mongosh "<YOUR_MONGODB_URI>" 02_mongo_queries.js
```

## 7. What to put in your project documentation
- This justification table (section 1)
- Collection schemas + a sample document of each type (section 2)
- The aggregation queries as "advanced feature: NoSQL aggregation"
- Screenshots of query output for the testing-results section
