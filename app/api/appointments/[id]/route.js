import { query } from '@/lib/mysql';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// PATCH /api/appointments/:id { status }
//   Patient: cancel their own scheduled appointment
//   Doctor:  complete / no-show / cancel their own
//   Admin:   any of the above
const ROLE_TARGETS = {
  Patient: ['Cancelled'],
  Doctor: ['Completed', 'No-Show', 'Cancelled'],
  Admin: ['Completed', 'No-Show', 'Cancelled'],
};

export async function PATCH(request, { params }) {
  const { session, res } = guard(['Patient', 'Doctor', 'Admin']);
  if (res) return res;

  const id = Number(params.id);
  const b = await body(request);
  if (!ROLE_TARGETS[session.role].includes(b.status)) return fail(403, `You cannot set an appointment to ${b.status}`);

  try {
    const [a] = await query('SELECT Patient_ID, Doctor_ID, Appointment_Status FROM Appointment WHERE Appointment_ID = ?', [id]);
    if (!a) return fail(404, 'Appointment not found');
    if (session.role === 'Patient' && a.Patient_ID !== session.patientId) return fail(403, 'Not your appointment');
    if (session.role === 'Doctor' && a.Doctor_ID !== session.doctorId) return fail(403, 'Not your appointment');
    if (a.Appointment_Status !== 'Scheduled') return fail(409, `This appointment is already ${a.Appointment_Status}`);

    await query('UPDATE Appointment SET Appointment_Status = ? WHERE Appointment_ID = ?', [b.status, id]);
    audit(session, 'UPDATE', 'Appointment', id, { status: ['Scheduled', b.status] });
    return ok();
  } catch (err) {
    return dbError(err);
  }
}
