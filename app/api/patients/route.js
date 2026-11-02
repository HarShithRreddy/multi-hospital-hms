import { query, withTransaction } from '@/lib/mysql';
import { ASSIGNED_PATIENTS_SQL, assignedParams } from '@/lib/access';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// GET /api/patients?q=  — Admin: all patients; Doctor: only assigned patients.
export async function GET(request) {
  const { session, res } = guard(['Admin', 'Doctor']);
  if (res) return res;

  const like = `%${request.nextUrl.searchParams.get('q') || ''}%`;
  const isDoctor = session.role === 'Doctor';
  const rows = await query(
    `SELECT Patient_ID, Patient_Name, Gender, Blood_Group, Phone, Email,
            TIMESTAMPDIFF(YEAR, Date_of_Birth, CURDATE()) AS Age
     FROM Patient
     WHERE (Patient_Name LIKE ? OR Phone LIKE ?)
     ${isDoctor ? `AND Patient_ID IN (${ASSIGNED_PATIENTS_SQL})` : ''}
     ORDER BY Patient_Name`,
    isDoctor ? [like, like, ...assignedParams(session.doctorId)] : [like, like]
  );
  return ok({ patients: rows });
}

// POST /api/patients — Admin registers a patient (+ optional emergency contact, one transaction).
export async function POST(request) {
  const { session, res } = guard(['Admin']);
  if (res) return res;

  const b = await body(request);
  if (!b.name || !b.dob || !b.gender || !b.phone) {
    return fail(400, 'Name, date of birth, gender and phone are required');
  }
  try {
    const patientId = await withTransaction(async (conn) => {
      const [r] = await conn.execute(
        `INSERT INTO Patient (Patient_Name, Date_of_Birth, Gender, Blood_Group, Phone, Email, Address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [b.name, b.dob, b.gender, b.bloodGroup || null, b.phone, b.email || null, b.address || null]
      );
      if (b.emergencyContact) {
        await conn.execute('INSERT INTO Emergency_Contact (Patient_ID, Contact_Number) VALUES (?, ?)', [r.insertId, b.emergencyContact]);
      }
      return r.insertId;
    });
    audit(session, 'CREATE', 'Patient', patientId);
    return ok({ ok: true, patientId });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') return fail(409, 'Phone or email already exists');
    return dbError(err);
  }
}
