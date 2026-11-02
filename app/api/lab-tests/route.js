import { query } from '@/lib/mysql';
import { doctorHasPatient } from '@/lib/access';
import { toMysqlDateTime } from '@/lib/format';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// POST /api/lab-tests — Doctor orders a lab test for an assigned patient.
export async function POST(request) {
  const { session, res } = guard(['Doctor']);
  if (res) return res;

  const b = await body(request);
  const patientId = Number(b.patientId);
  const testName = String(b.testName || '').trim();
  if (!patientId || !testName) return fail(400, 'Patient and test name are required');
  if (!(await doctorHasPatient(session.doctorId, patientId))) {
    return fail(403, 'You can only order tests for patients assigned to you');
  }

  try {
    const r = await query(
      `INSERT INTO Lab_Test (Patient_ID, Doctor_ID, Test_Name, Test_Date, Test_Status) VALUES (?, ?, ?, ?, 'Ordered')`,
      [patientId, session.doctorId, testName, toMysqlDateTime(b.testDate) || new Date()]
    );
    audit(session, 'ORDER_TEST', 'Lab_Test', r.insertId, { patient_id: patientId, test: testName });
    return ok({ ok: true, testId: r.insertId });
  } catch (err) {
    return dbError(err);
  }
}
