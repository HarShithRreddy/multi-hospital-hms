import { query } from '@/lib/mysql';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

const ALLOWED = { Pending: ['Paid'], Paid: ['Refunded'] };

// PATCH /api/payments/:id { status } — Pending -> Paid, Paid -> Refunded.
export async function PATCH(request, { params }) {
  const { session, res } = guard(['Admin']);
  if (res) return res;
  const id = Number(params.id);
  const b = await body(request);
  try {
    const [p] = await query('SELECT Payment_Status FROM Payment WHERE Payment_ID = ?', [id]);
    if (!p) return fail(404, 'Payment not found');
    if (!(ALLOWED[p.Payment_Status] || []).includes(b.status)) {
      return fail(409, `Cannot change a ${p.Payment_Status} payment to ${b.status}`);
    }
    await query('UPDATE Payment SET Payment_Status = ? WHERE Payment_ID = ?', [b.status, id]);
    audit(session, 'UPDATE', 'Payment', id, { status: [p.Payment_Status, b.status] });
    return ok();
  } catch (err) {
    return dbError(err);
  }
}
