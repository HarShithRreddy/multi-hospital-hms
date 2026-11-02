import { withTransaction } from '@/lib/mysql';
import { doctorHasPatient } from '@/lib/access';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// POST /api/admissions — admit a patient to a free bed.
// TRANSACTION: lock the bed row (SELECT … FOR UPDATE) so two people cannot
// admit into the same bed at once, check the patient isn't already admitted,
// insert the admission (trigger trg_after_admission_insert marks the bed
// Occupied), and optionally record an advance-deposit payment.
export async function POST(request) {
  const { session, res } = guard(['Admin', 'Doctor']);
  if (res) return res;

  const b = await body(request);
  const patientId = Number(b.patientId);
  const bedId = Number(b.bedId);
  const doctorId = session.role === 'Doctor' ? session.doctorId : Number(b.doctorId);
  const deposit = Number(b.deposit || 0);

  if (!patientId || !bedId || !doctorId) return fail(400, 'Patient, bed and admitting doctor are required');
  if (deposit < 0) return fail(400, 'Deposit cannot be negative');
  if (session.role === 'Doctor' && !(await doctorHasPatient(doctorId, patientId))) {
    return fail(403, 'You can only admit patients assigned to you');
  }

  try {
    const result = await withTransaction(async (conn) => {
      const [[bed]] = await conn.execute('SELECT Status FROM Bed WHERE Bed_ID = ? FOR UPDATE', [bedId]);
      if (!bed) throw Object.assign(new Error(), { user: [404, 'Bed not found'] });
      if (bed.Status !== 'Available') throw Object.assign(new Error(), { user: [409, `That bed is ${bed.Status.toLowerCase()} — pick another`] });

      // Don't trust the status column alone: also check for an active admission on the bed.
      const [inBed] = await conn.execute(
        "SELECT 1 FROM Admission WHERE Bed_ID = ? AND Admission_Status = 'Admitted' LIMIT 1", [bedId]);
      if (inBed.length) throw Object.assign(new Error(), { user: [409, 'A patient is already admitted to that bed'] });

      const [already] = await conn.execute(
        "SELECT 1 FROM Admission WHERE Patient_ID = ? AND Admission_Status = 'Admitted' LIMIT 1", [patientId]);
      if (already.length) throw Object.assign(new Error(), { user: [409, 'This patient is already admitted'] });

      const [ad] = await conn.execute(
        `INSERT INTO Admission (Patient_ID, Bed_ID, Admitting_Doctor_ID, Admission_Date, Diagnosis, Admission_Status)
         VALUES (?, ?, ?, NOW(), ?, 'Admitted')`,
        [patientId, bedId, doctorId, b.diagnosis || null]
      );

      let paymentId = null;
      if (deposit > 0) {
        const [pay] = await conn.execute(
          `INSERT INTO Payment (Patient_ID, Admission_ID, Insurance_ID, Amount, Payment_Date, Payment_Method, Payment_Status)
           VALUES (?, ?, NULL, ?, NOW(), ?, 'Paid')`,
          [patientId, ad.insertId, deposit, b.method || 'Cash']
        );
        paymentId = pay.insertId;
      }
      return { admissionId: ad.insertId, paymentId };
    });
    audit(session, 'ADMIT', 'Admission', result.admissionId, { patient_id: patientId, bed_id: bedId });
    return ok({ ok: true, ...result });
  } catch (err) {
    if (err.user) return fail(...err.user);
    return dbError(err);
  }
}
