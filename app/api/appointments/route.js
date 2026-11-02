import { query, withTransaction } from '@/lib/mysql';
import { toMysqlDateTime } from '@/lib/format';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// GET /api/appointments — role-scoped list.
//   Patient -> own appointments · Doctor -> assigned to them · Admin -> all
export async function GET() {
  const { session, res } = guard();
  if (res) return res;

  let sql = `SELECT a.Appointment_ID, a.Patient_ID, p.Patient_Name, a.Doctor_ID, d.Doctor_Name,
                    dep.Department_Name, h.Hospital_Name,
                    a.Appointment_DateTime, a.Appointment_Status, a.Reason
             FROM Appointment a
             JOIN Patient p      ON a.Patient_ID = p.Patient_ID
             JOIN Doctor d       ON a.Doctor_ID  = d.Doctor_ID
             JOIN Department dep ON d.Department_ID = dep.Department_ID
             JOIN Hospital h     ON dep.Hospital_ID = h.Hospital_ID`;
  const params = [];
  if (session.role === 'Patient') { sql += ' WHERE a.Patient_ID = ?'; params.push(session.patientId); }
  else if (session.role === 'Doctor') { sql += ' WHERE a.Doctor_ID = ?'; params.push(session.doctorId); }
  sql += ' ORDER BY a.Appointment_DateTime DESC';

  return ok({ appointments: await query(sql, params) });
}

// POST /api/appointments — book via the stored procedure sp_book_appointment.
// The procedure itself rejects past dates (SIGNAL), so that rule lives in the
// database. A doctor's slot is locked first so it cannot be double-booked.
export async function POST(request) {
  const { session, res } = guard(['Patient', 'Admin']);
  if (res) return res;

  const b = await body(request);
  const patientId = session.role === 'Patient' ? session.patientId : Number(b.patientId);
  const doctorId = Number(b.doctorId);
  const when = toMysqlDateTime(b.datetime);
  if (!patientId || !doctorId || !when) return fail(400, 'Patient, doctor and date/time are required');

  try {
    const appointmentId = await withTransaction(async (conn) => {
      const [[doc]] = await conn.execute('SELECT Doctor_ID FROM Doctor WHERE Doctor_ID = ?', [doctorId]);
      if (!doc) throw Object.assign(new Error(), { user: [400, 'Doctor not found'] });

      const [clash] = await conn.execute(
        `SELECT 1 FROM Appointment
         WHERE Doctor_ID = ? AND Appointment_DateTime = ? AND Appointment_Status = 'Scheduled' FOR UPDATE`,
        [doctorId, when]
      );
      if (clash.length) throw Object.assign(new Error(), { user: [409, 'The doctor already has an appointment at that time'] });

      await conn.query('CALL sp_book_appointment(?, ?, ?, ?, @new_appt_id)', [patientId, doctorId, when, b.reason || null]);
      const [[row]] = await conn.query('SELECT @new_appt_id AS id');
      return row.id;
    });
    audit(session, 'BOOK', 'Appointment', appointmentId, { doctor_id: doctorId, patient_id: patientId });
    return ok({ ok: true, appointmentId });
  } catch (err) {
    if (err.user) return fail(...err.user);
    return dbError(err);
  }
}
