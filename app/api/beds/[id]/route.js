import { query } from '@/lib/mysql';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// PATCH /api/beds/:id { status: 'Available' | 'Maintenance' }
// Occupied is never set by hand — the admission triggers own that transition.
export async function PATCH(request, { params }) {
  const { session, res } = guard(['Admin']);
  if (res) return res;
  const id = Number(params.id);
  const b = await body(request);
  if (!['Available', 'Maintenance'].includes(b.status)) return fail(400, 'Status must be Available or Maintenance');

  try {
    const [bed] = await query('SELECT Status FROM Bed WHERE Bed_ID = ?', [id]);
    if (!bed) return fail(404, 'Bed not found');
    if (bed.Status === 'Occupied') return fail(409, 'This bed is occupied — it frees automatically when the patient is discharged');
    await query('UPDATE Bed SET Status = ? WHERE Bed_ID = ?', [b.status, id]);
    audit(session, 'UPDATE', 'Bed', id, { status: [bed.Status, b.status] });
    return ok();
  } catch (err) {
    return dbError(err);
  }
}
