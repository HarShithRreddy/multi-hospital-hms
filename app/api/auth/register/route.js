import bcrypt from 'bcryptjs';
import { withTransaction } from '@/lib/mysql';
import { signToken, COOKIE_NAME } from '@/lib/auth';
import { ok, fail, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// POST /api/auth/register — patient self-registration.
// Creates the Patient row and its App_User login atomically (one transaction),
// so a failure in either leaves no half-registered account behind.
export async function POST(request) {
  const b = await body(request);
  const username = String(b.username || '').trim();

  if (!/^[a-zA-Z0-9_.]{3,50}$/.test(username)) {
    return fail(400, 'Username must be 3–50 letters, numbers, dots or underscores');
  }
  if (!b.password || String(b.password).length < 8) {
    return fail(400, 'Password must be at least 8 characters');
  }
  if (!b.name || !b.dob || !b.gender || !b.phone) {
    return fail(400, 'Name, date of birth, gender and phone are required');
  }
  if (!/^[0-9+\- ]{8,15}$/.test(b.phone)) return fail(400, 'Phone number looks invalid');

  try {
    const hash = await bcrypt.hash(String(b.password), 10);
    const ids = await withTransaction(async (conn) => {
      const [taken] = await conn.execute('SELECT 1 FROM App_User WHERE Username = ?', [username]);
      if (taken.length) throw Object.assign(new Error('taken'), { userTaken: true });

      const [p] = await conn.execute(
        `INSERT INTO Patient (Patient_Name, Date_of_Birth, Gender, Blood_Group, Phone, Email, Address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [b.name, b.dob, b.gender, b.bloodGroup || null, b.phone, b.email || null, b.address || null]
      );
      if (b.emergencyContact) {
        await conn.execute('INSERT INTO Emergency_Contact (Patient_ID, Contact_Number) VALUES (?, ?)',
          [p.insertId, b.emergencyContact]);
      }
      const [u] = await conn.execute(
        `INSERT INTO App_User (Username, Password_Hash, Role, Patient_ID) VALUES (?, ?, 'Patient', ?)`,
        [username, hash, p.insertId]
      );
      return { patientId: p.insertId, userId: u.insertId };
    });

    const session = { userId: ids.userId, username, role: 'Patient', patientId: ids.patientId, doctorId: null };
    audit(session, 'REGISTER', 'Patient', ids.patientId);

    const res = ok({ ok: true, patientId: ids.patientId });
    res.cookies.set(COOKIE_NAME, signToken(session), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 });
    return res;
  } catch (err) {
    if (err.userTaken) return fail(409, 'That username is already taken');
    if (err?.code === 'ER_DUP_ENTRY') return fail(409, 'That phone number or email is already registered');
    return dbError(err);
  }
}
