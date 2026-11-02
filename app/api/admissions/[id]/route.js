import { query } from '@/lib/mysql';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// PATCH /api/admissions/:id
//   { action: 'discharge' }               -> CALL sp_discharge_patient (trigger frees the bed)
//   { action: 'diagnosis', diagnosis }    -> update treatment / diagnosis
// Allowed: Admin, or the admitting doctor.
export async function PATCH(request, { params }) {
  const { session, res } = guard(['Admin', 'Doctor']);
  if (res) return res;

  const id = Number(params.id);
  const b = await body(request);
  const [adm] = await query('SELECT Admission_ID, Admitting_Doctor_ID, Admission_Status, Bed_ID FROM Admission WHERE Admission_ID = ?', [id]);
  if (!adm) return fail(404, 'Admission not found');
  if (session.role === 'Doctor' && adm.Admitting_Doctor_ID !== session.doctorId) {
    return fail(403, 'Only the admitting doctor or an admin can change this admission');
  }
  if (adm.Admission_Status !== 'Admitted') return fail(409, `This patient is already ${adm.Admission_Status.toLowerCase()}`);

  try {
    if (b.action === 'discharge') {
      await query('CALL sp_discharge_patient(?, NOW())', [id]);
      const [[after], [bed]] = await Promise.all([
        query('SELECT Admission_Status FROM Admission WHERE Admission_ID = ?', [id]),
        query('SELECT Status FROM Bed WHERE Bed_ID = ?', [adm.Bed_ID]),
      ]);
      audit(session, 'DISCHARGE', 'Admission', id);
      return ok({ ok: true, admissionStatus: after.Admission_Status, bedStatus: bed.Status });
    }
    if (b.action === 'diagnosis') {
      const dx = String(b.diagnosis || '').trim();
      if (!dx) return fail(400, 'Diagnosis cannot be empty');
      await query('UPDATE Admission SET Diagnosis = ? WHERE Admission_ID = ?', [dx, id]);
      audit(session, 'UPDATE_DIAGNOSIS', 'Admission', id);
      return ok();
    }
    return fail(400, 'Unknown action');
  } catch (err) {
    return dbError(err);
  }
}
