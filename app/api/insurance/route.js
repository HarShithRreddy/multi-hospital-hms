import { query } from '@/lib/mysql';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// POST /api/insurance — Admin adds a policy.
// Date order and non-negative cover are deliberately left to the database's
// CHECK constraints (CHK_Insurance_Dates, CHK_Insurance_Coverage) to show
// validation enforced at the database level.
export async function POST(request) {
  const { session, res } = guard(['Admin']);
  if (res) return res;
  const b = await body(request);
  if (!b.patientId || !b.provider || !b.policyNumber || b.coverage === '' || b.coverage == null || !b.startDate || !b.endDate) {
    return fail(400, 'All fields are required');
  }
  try {
    const r = await query(
      `INSERT INTO Insurance (Patient_ID, Provider_Name, Policy_Number, Coverage_Amount, Start_Date, End_Date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [b.patientId, b.provider, b.policyNumber, Number(b.coverage), b.startDate, b.endDate]
    );
    audit(session, 'CREATE', 'Insurance', r.insertId);
    return ok({ ok: true, insuranceId: r.insertId });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') return fail(409, 'That policy number already exists');
    if (err?.errno === 3819 || err?.errno === 4025) {
      const which = /Dates/i.test(err.sqlMessage) ? 'end date must be on or after the start date'
        : /Coverage/i.test(err.sqlMessage) ? 'cover cannot be negative' : err.sqlMessage;
      return fail(400, `Rejected by the database CHECK constraint: ${which}`);
    }
    return dbError(err);
  }
}
