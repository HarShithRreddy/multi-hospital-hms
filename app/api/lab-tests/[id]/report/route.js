import { query, withTransaction } from '@/lib/mysql';
import { getDb } from '@/lib/mongodb';
import { doctorHasPatient } from '@/lib/access';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// POST /api/lab-tests/:id/report — record a result for an ordered test.
//  MySQL (TRANSACTION): insert Lab_Report (1:1, UNIQUE Test_ID) + mark Lab_Test Completed.
//  MongoDB: store the detailed, free-form report document in medical_reports.
export async function POST(request, { params }) {
  const { session, res } = guard(['Doctor', 'Admin']);
  if (res) return res;

  const testId = Number(params.id);
  const b = await body(request);
  const summary = String(b.summary || '').trim();
  if (!summary) return fail(400, 'A result summary is required');

  const [test] = await query('SELECT Test_ID, Patient_ID, Doctor_ID, Test_Name, Test_Status FROM Lab_Test WHERE Test_ID = ?', [testId]);
  if (!test) return fail(404, 'Lab test not found');
  if (test.Test_Status !== 'Ordered') return fail(409, `This test is already ${test.Test_Status.toLowerCase()}`);
  if (session.role === 'Doctor' && !(await doctorHasPatient(session.doctorId, test.Patient_ID))) {
    return fail(403, 'This patient is not assigned to you');
  }

  try {
    await withTransaction(async (conn) => {
      await conn.execute(
        'INSERT INTO Lab_Report (Test_ID, Report_Date, Result_Summary, Normal_Range) VALUES (?, NOW(), ?, ?)',
        [testId, summary, b.normalRange || null]
      );
      await conn.execute("UPDATE Lab_Test SET Test_Status = 'Completed' WHERE Test_ID = ?", [testId]);
    });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') return fail(409, 'This test already has a report');
    return dbError(err);
  }

  audit(session, 'UPLOAD_REPORT', 'Lab_Report', testId);

  let warning;
  try {
    const db = await getDb();
    const doc = {
      test_id: testId,
      patient_id: test.Patient_ID,
      doctor_id: test.Doctor_ID,
      report_type: b.reportType || 'Other',
      test_name: test.Test_Name,
      report_date: new Date(),
      summary,
      verified: true,
      entered_by: session.username,
    };
    if (b.normalRange) doc.normal_range = b.normalRange;
    if (String(b.findings || '').trim()) doc.findings = String(b.findings).trim();
    await db.collection('medical_reports').insertOne(doc);
  } catch {
    warning = 'Result saved in MySQL, but the detailed report could not be written to MongoDB';
  }
  return ok({ ok: true, warning });
}
