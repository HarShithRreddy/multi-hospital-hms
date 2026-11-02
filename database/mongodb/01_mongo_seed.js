// ============================================================
// MULTI-HOSPITAL HEALTHCARE MANAGEMENT SYSTEM  —  Team 16
// SECOND DATABASE PARADIGM:  MongoDB (document store)
// 01_mongo_seed.js  —  collections + sample documents + indexes
//
// WHY MONGODB:  the relational MySQL DB holds all structured,
// transactional data (IDs, foreign keys, appointments, beds,
// payments). This document store holds the free-form, VARIABLE-
// structure clinical content whose fields differ per case and
// do not fit fixed SQL columns.
//
// Documents link back to MySQL by storing the SQL integer IDs
// (patient_id, test_id, doctor_id, appointment_id) as fields.
//
// RUN:   mongosh "mongodb://localhost:27017" 01_mongo_seed.js
//   or inside mongosh:   load("01_mongo_seed.js")
// ============================================================

use("MultiHospitalHealthcare");

// ---- clean start (safe to re-run) ----
db.medical_reports.drop();
db.clinical_notes.drop();
db.audit_logs.drop();

// ============================================================
// COLLECTION 1: medical_reports
// Structure deliberately varies by report_type (Blood Test /
// Radiology / MRI) — the core justification for a document DB.
// ============================================================
db.medical_reports.insertMany([
  {
    test_id: 1, patient_id: 1, doctor_id: 5,
    report_type: "Blood Test",
    panel: "Complete Blood Count (CBC)",
    report_date: ISODate("2026-10-20T09:30:00Z"),
    analytes: [
      { name: "Hemoglobin", value: 11.2, unit: "g/dL", ref_low: 13.0, ref_high: 17.0, flag: "Low" },
      { name: "WBC",        value: 7.5,  unit: "10^3/uL", ref_low: 4.0, ref_high: 11.0, flag: "Normal" },
      { name: "Platelets",  value: 230,  unit: "10^3/uL", ref_low: 150, ref_high: 450, flag: "Normal" }
    ],
    technician: "Lab Tech A",
    verified: true
  },
  {
    test_id: 2, patient_id: 2, doctor_id: 7,
    report_type: "Radiology",
    modality: "X-Ray",
    body_part: "Chest",
    report_date: ISODate("2026-10-21T14:10:00Z"),
    findings: "No active lung lesion. Mild cardiomegaly observed.",
    impression: "Mild cardiomegaly; clinical correlation advised.",
    images: ["xray_chest_0021_a.dcm", "xray_chest_0021_b.dcm"],
    verified: true
  },
  {
    test_id: 3, patient_id: 1, doctor_id: 5,
    report_type: "MRI",
    modality: "MRI",
    body_part: "Brain",
    report_date: ISODate("2026-10-24T11:00:00Z"),
    sequences: ["T1", "T2", "FLAIR"],
    findings: "No acute infarct. Age-appropriate changes.",
    contrast_used: false,
    verified: false
  }
]);

// ============================================================
// COLLECTION 2: clinical_notes
// Doctor's consultation notes per visit. Nested vitals,
// variable-length symptom/medication arrays, optional fields.
// ============================================================
db.clinical_notes.insertMany([
  {
    appointment_id: 1, patient_id: 1, doctor_id: 5,
    visit_date: ISODate("2026-10-20T09:00:00Z"),
    chief_complaint: "Fatigue and dizziness",
    symptoms: ["fatigue", "dizziness", "pallor"],
    vitals: { bp: "110/70", pulse: 88, temp_c: 37.1, spo2: 98 },
    provisional_diagnosis: "Suspected anemia",
    advice: "CBC ordered; iron-rich diet advised.",
    follow_up_days: 7
  },
  {
    appointment_id: 2, patient_id: 2, doctor_id: 7,
    visit_date: ISODate("2026-10-21T13:30:00Z"),
    chief_complaint: "Breathlessness on exertion",
    symptoms: ["dyspnea", "chest discomfort"],
    vitals: { bp: "140/90", pulse: 96, temp_c: 36.8, spo2: 95 },
    provisional_diagnosis: "Rule out cardiac cause",
    medications_advised: [ { name: "Aspirin", note: "75mg once daily" } ],
    follow_up_days: 3
  },
  {
    appointment_id: 3, patient_id: 1, doctor_id: 5,
    visit_date: ISODate("2026-10-27T10:15:00Z"),
    chief_complaint: "Follow-up for anemia",
    symptoms: ["mild fatigue"],
    vitals: { bp: "112/72", pulse: 80, temp_c: 36.9, spo2: 99 },
    provisional_diagnosis: "Iron-deficiency anemia, improving",
    follow_up_days: 14
  }
]);

// ============================================================
// COLLECTION 3: audit_logs
// High-volume, append-only, schema-flexible activity trail.
// Supports role-based-access auditing requirement.
// ============================================================
db.audit_logs.insertMany([
  { ts: ISODate("2026-10-20T08:55:00Z"), user_role: "Doctor", user_id: 5,  action: "LOGIN",         ip: "10.0.0.5" },
  { ts: ISODate("2026-10-20T09:05:00Z"), user_role: "Doctor", user_id: 5,  action: "VIEW_RECORD",   entity: "Patient",    entity_id: 1 },
  { ts: ISODate("2026-10-20T09:32:00Z"), user_role: "Staff",  user_id: 12, action: "UPLOAD_REPORT", entity: "Lab_Report", entity_id: 1 },
  { ts: ISODate("2026-10-21T10:00:00Z"), user_role: "Admin",  user_id: 1,  action: "UPDATE",        entity: "Bed",        entity_id: 3, changes: { Status: ["Available", "Occupied"] } },
  { ts: ISODate("2026-10-21T13:35:00Z"), user_role: "Doctor", user_id: 7,  action: "ADD_NOTE",      entity: "Patient",    entity_id: 2 },
  { ts: ISODate("2026-10-27T10:16:00Z"), user_role: "Doctor", user_id: 5,  action: "ADD_NOTE",      entity: "Patient",    entity_id: 1 }
]);

// ============================================================
// INDEXES  (ticks the "indexing" advanced feature on the NoSQL side)
// ============================================================
db.medical_reports.createIndex({ patient_id: 1 });
db.medical_reports.createIndex({ report_type: 1 });
db.clinical_notes.createIndex({ patient_id: 1, visit_date: -1 });
db.audit_logs.createIndex({ ts: -1 });
db.audit_logs.createIndex({ user_role: 1, action: 1 });

// ---- verify ----
print("medical_reports :", db.medical_reports.countDocuments());
print("clinical_notes  :", db.clinical_notes.countDocuments());
print("audit_logs      :", db.audit_logs.countDocuments());
print("Seed complete.");
