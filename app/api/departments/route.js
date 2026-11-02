import { query } from '@/lib/mysql';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// POST /api/departments — Admin creates a department in a hospital.
export async function POST(request) {
  const { session, res } = guard(['Admin']);
  if (res) return res;
  const b = await body(request);
  if (!b.hospitalId || !String(b.name || '').trim()) return fail(400, 'Hospital and department name are required');
  try {
    const r = await query('INSERT INTO Department (Hospital_ID, Department_Name, Location) VALUES (?, ?, ?)',
      [b.hospitalId, String(b.name).trim(), b.location || null]);
    audit(session, 'CREATE', 'Department', r.insertId);
    return ok({ ok: true, departmentId: r.insertId });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') return fail(409, 'That hospital already has a department with this name');
    return dbError(err);
  }
}
