import { getDb } from '@/lib/mongodb';
import { doctorHasPatient } from '@/lib/access';
import { ok, fail, guard, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// POST /api/notes — Doctor adds a clinical note (MongoDB clinical_notes).
// Only the fields the doctor fills in are stored, so documents vary in shape —
// the reason this data lives in a document store rather than a fixed table.
export async function POST(request) {
  const { session, res } = guard(['Doctor']);
  if (res) return res;

  const b = await body(request);
  const patientId = Number(b.patientId);
  if (!patientId || !String(b.chiefComplaint || '').trim()) return fail(400, 'Chief complaint is required');
  if (!(await doctorHasPatient(session.doctorId, patientId))) {
    return fail(403, 'You can only add notes for patients assigned to you');
  }

  const doc = {
    patient_id: patientId,
    doctor_id: session.doctorId,
    visit_date: new Date(),
    chief_complaint: String(b.chiefComplaint).trim(),
  };
  if (b.appointmentId) doc.appointment_id = Number(b.appointmentId);
  const symptoms = String(b.symptoms || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (symptoms.length) doc.symptoms = symptoms;

  const vitals = {};
  if (b.bp) vitals.bp = String(b.bp);
  if (b.pulse) vitals.pulse = Number(b.pulse);
  if (b.temp) vitals.temp_c = Number(b.temp);
  if (b.spo2) vitals.spo2 = Number(b.spo2);
  if (Object.keys(vitals).length) doc.vitals = vitals;

  if (b.diagnosis) doc.provisional_diagnosis = String(b.diagnosis);
  if (b.advice) doc.advice = String(b.advice);
  if (b.followUp !== '' && b.followUp != null) doc.follow_up_days = Number(b.followUp);

  try {
    const db = await getDb();
    const r = await db.collection('clinical_notes').insertOne(doc);
    audit(session, 'ADD_NOTE', 'Patient', patientId);
    return ok({ ok: true, noteId: String(r.insertedId) });
  } catch {
    return fail(503, 'MongoDB is unavailable — note not saved');
  }
}
