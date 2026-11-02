// ============================================================
// MULTI-HOSPITAL HEALTHCARE MANAGEMENT SYSTEM  —  Team 16
// 02_mongo_queries.js  —  MongoDB aggregation pipelines
//
// These demonstrate the "NoSQL aggregation" ADVANCED FEATURE
// (one of your required 4). Run after 01_mongo_seed.js.
//
// RUN:   mongosh "mongodb://localhost:27017" 02_mongo_queries.js
//   or inside mongosh:   load("02_mongo_queries.js")
// ============================================================

use("MultiHospitalHealthcare");

// ------------------------------------------------------------
// Q1. Count of reports grouped by report_type  (GROUP BY equiv.)
// ------------------------------------------------------------
print("\nQ1 — Reports per type:");
printjson(
  db.medical_reports.aggregate([
    { $group: { _id: "$report_type", total: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ]).toArray()
);

// ------------------------------------------------------------
// Q2. All reports for patient_id = 1, newest first
// ------------------------------------------------------------
print("\nQ2 — Reports for patient 1 (newest first):");
printjson(
  db.medical_reports.aggregate([
    { $match: { patient_id: 1 } },
    { $sort: { report_date: -1 } },
    { $project: { _id: 0, report_type: 1, report_date: 1, verified: 1 } }
  ]).toArray()
);

// ------------------------------------------------------------
// Q3. ABNORMAL blood results — unwind the nested analytes array
//     and keep only out-of-range (flag != "Normal") values.
//     Showcases querying inside nested documents (not possible
//     in a flat SQL column).
// ------------------------------------------------------------
print("\nQ3 — Abnormal analytes across all blood reports:");
printjson(
  db.medical_reports.aggregate([
    { $match: { report_type: "Blood Test" } },
    { $unwind: "$analytes" },
    { $match: { "analytes.flag": { $ne: "Normal" } } },
    { $project: {
        _id: 0, patient_id: 1,
        analyte: "$analytes.name",
        value: "$analytes.value",
        flag: "$analytes.flag"
    } }
  ]).toArray()
);

// ------------------------------------------------------------
// Q4. Audit activity — count actions per role per day
//     (GROUP BY on a derived date + multi-key grouping)
// ------------------------------------------------------------
print("\nQ4 — Audit actions per role per day:");
printjson(
  db.audit_logs.aggregate([
    { $group: {
        _id: {
          day: { $dateToString: { format: "%Y-%m-%d", date: "$ts" } },
          role: "$user_role"
        },
        actions: { $sum: 1 }
    } },
    { $sort: { "_id.day": 1, "_id.role": 1 } }
  ]).toArray()
);

// ------------------------------------------------------------
// Q5. $lookup JOIN inside MongoDB — attach each patient's
//     clinical notes to their reports (document-level join on
//     patient_id). Shows NoSQL can also do relational-style joins.
// ------------------------------------------------------------
print("\nQ5 — Reports joined with that patient's clinical notes:");
printjson(
  db.medical_reports.aggregate([
    { $lookup: {
        from: "clinical_notes",
        localField: "patient_id",
        foreignField: "patient_id",
        as: "notes"
    } },
    { $project: {
        _id: 0, patient_id: 1, report_type: 1,
        note_count: { $size: "$notes" }
    } }
  ]).toArray()
);

print("\nAll queries complete.");
