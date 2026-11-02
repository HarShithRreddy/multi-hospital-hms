import bcrypt from 'bcryptjs';
import { withTransaction } from '@/lib/mysql';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// POST /api/doctors — Admin adds a doctor, optionally with a login account.
// Doctor + App_User are written in one transaction.
export async function POST(request) {
  const { session, res } = guard(['Admin']);
  if (res) return res;

  const b = await body(request);
  if (!b.name || !b.departmentId || !b.specialization || !b.licenseNo) {
    return fail(400, 'Name, department, specialization and license number are required');
  }
  if (b.username && String(b.password || '').length < 8) {
    return fail(400, 'A login needs a password of at least 8 characters');
  }

  try {
    const hash = b.username ? await bcrypt.hash(String(b.password), 10) : null;
    const doctorId = await withTransaction(async (conn) => {
      const [d] = await conn.execute(
        `INSERT INTO Doctor (Department_ID, Doctor_Name, Specialization, Phone, Email, License_No, Experience_Years)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [b.departmentId, b.name, b.specialization, b.phone || null, b.email || null, b.licenseNo,
          b.experience === '' || b.experience == null ? 0 : Number(b.experience)]
      );
      if (b.username) {
        await conn.execute(
          `INSERT INTO App_User (Username, Password_Hash, Role, Doctor_ID) VALUES (?, ?, 'Doctor', ?)`,
          [String(b.username).trim(), hash, d.insertId]
        );
      }
      return d.insertId;
    });
    audit(session, 'CREATE', 'Doctor', doctorId);
    return ok({ ok: true, doctorId });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return fail(409, 'License number, phone, email or username already exists');
    }
    return dbError(err);
  }
}
