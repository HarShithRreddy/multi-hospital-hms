import { query } from '@/lib/mysql';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// POST /api/staff — Admin adds a support-staff member ({type:'staff'}) or a nurse ({type:'nurse'}).
export async function POST(request) {
  const { session, res } = guard(['Admin']);
  if (res) return res;
  const b = await body(request);
  try {
    if (b.type === 'nurse') {
      if (!b.departmentId || !b.name) return fail(400, 'Department and name are required');
      const r = await query('INSERT INTO Nurse (Department_ID, Nurse_Name, Phone, Qualification) VALUES (?, ?, ?, ?)',
        [b.departmentId, b.name, b.phone || null, b.qualification || null]);
      audit(session, 'CREATE', 'Nurse', r.insertId);
      return ok({ ok: true, id: r.insertId });
    }
    if (!b.hospitalId || !b.name || !b.role) return fail(400, 'Hospital, name and role are required');
    const r = await query('INSERT INTO Staff (Hospital_ID, Staff_Name, Role, Phone, Email) VALUES (?, ?, ?, ?, ?)',
      [b.hospitalId, b.name, b.role, b.phone || null, b.email || null]);
    audit(session, 'CREATE', 'Staff', r.insertId);
    return ok({ ok: true, id: r.insertId });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') return fail(409, 'That phone number or email is already in use');
    return dbError(err);
  }
}
