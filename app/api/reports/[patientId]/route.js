import { getDb } from '@/lib/mongodb';
import { canViewPatient } from '@/lib/access';
import { ok, fail, guard } from '@/lib/http';

// GET /api/reports/:patientId — a patient's MongoDB documents as JSON.
export async function GET(_request, { params }) {
  const { session, res } = guard();
  if (res) return res;

  const patientId = Number(params.patientId);
  if (!(await canViewPatient(session, patientId))) return fail(403, 'You cannot view this patient');

  try {
    const db = await getDb();
    const [reports, notes] = await Promise.all([
      db.collection('medical_reports').find({ patient_id: patientId }).sort({ report_date: -1 }).toArray(),
      db.collection('clinical_notes').find({ patient_id: patientId }).sort({ visit_date: -1 }).toArray(),
    ]);
    return ok({ reports, notes });
  } catch {
    return fail(503, 'Could not reach the document store');
  }
}
