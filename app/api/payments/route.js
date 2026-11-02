import { withTransaction } from '@/lib/mysql';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');

// POST /api/payments — Admin records a payment, optionally billed to insurance.
// Insurance processing runs in a TRANSACTION with the policy row locked, so two
// concurrent claims cannot both spend the same remaining cover.
export async function POST(request) {
  const { session, res } = guard(['Admin']);
  if (res) return res;

  const b = await body(request);
  const patientId = Number(b.patientId);
  const amount = Number(b.amount);
  const admissionId = b.admissionId ? Number(b.admissionId) : null;
  const insuranceId = b.insuranceId ? Number(b.insuranceId) : null;

  if (!patientId || !(amount > 0)) return fail(400, 'Patient and a positive amount are required');
  if (!['Paid', 'Pending'].includes(b.status)) return fail(400, 'Status must be Paid or Pending');
  if (!b.method) return fail(400, 'Payment method is required');

  try {
    const paymentId = await withTransaction(async (conn) => {
      if (admissionId) {
        const [[a]] = await conn.execute('SELECT Patient_ID FROM Admission WHERE Admission_ID = ?', [admissionId]);
        if (!a || a.Patient_ID !== patientId) throw Object.assign(new Error(), { user: [400, 'That admission belongs to a different patient'] });
      }
      if (insuranceId) {
        const [[pol]] = await conn.execute(
          `SELECT Patient_ID, Coverage_Amount, (CURDATE() BETWEEN Start_Date AND End_Date) AS Active
           FROM Insurance WHERE Insurance_ID = ? FOR UPDATE`, [insuranceId]);
        if (!pol || pol.Patient_ID !== patientId) throw Object.assign(new Error(), { user: [400, 'That policy belongs to a different patient'] });
        if (!pol.Active) throw Object.assign(new Error(), { user: [400, 'That policy is not valid today'] });
        const [[{ used }]] = await conn.execute(
          "SELECT COALESCE(SUM(Amount), 0) AS used FROM Payment WHERE Insurance_ID = ? AND Payment_Status <> 'Refunded'", [insuranceId]);
        const remaining = Number(pol.Coverage_Amount) - Number(used);
        if (amount > remaining) throw Object.assign(new Error(), { user: [400, `Claim exceeds remaining cover (${inr(remaining)} left)`] });
      }
      const [r] = await conn.execute(
        `INSERT INTO Payment (Patient_ID, Admission_ID, Insurance_ID, Amount, Payment_Date, Payment_Method, Payment_Status)
         VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
        [patientId, admissionId, insuranceId, amount, b.method, b.status]
      );
      return r.insertId;
    });
    audit(session, 'PAYMENT', 'Payment', paymentId, { amount, insurance_id: insuranceId });
    return ok({ ok: true, paymentId });
  } catch (err) {
    if (err.user) return fail(...err.user);
    return dbError(err);
  }
}
