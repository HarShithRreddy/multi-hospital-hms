import { query } from '@/lib/mysql';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// POST /api/beds — Admin adds a bed. Hospital is derived from the department so
// the two foreign keys on Bed can never disagree.
export async function POST(request) {
  const { session, res } = guard(['Admin']);
  if (res) return res;
  const b = await body(request);
  const bedNumber = String(b.bedNumber || '').trim();
  if (!b.departmentId || !bedNumber || !b.wardType) return fail(400, 'Department, bed number and ward type are required');

  try {
    const [dep] = await query('SELECT Hospital_ID FROM Department WHERE Department_ID = ?', [b.departmentId]);
    if (!dep) return fail(400, 'Department not found');
    const r = await query(
      "INSERT INTO Bed (Hospital_ID, Department_ID, Bed_Number, Ward_Type, Status) VALUES (?, ?, ?, ?, 'Available')",
      [dep.Hospital_ID, b.departmentId, bedNumber, b.wardType]
    );
    audit(session, 'CREATE', 'Bed', r.insertId);
    return ok({ ok: true, bedId: r.insertId });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') return fail(409, 'That hospital already has a bed with this number');
    return dbError(err);
  }
}
