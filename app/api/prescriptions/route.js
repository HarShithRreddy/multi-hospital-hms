import { withTransaction } from '@/lib/mysql';
import { doctorHasPatient } from '@/lib/access';
import { ok, fail, guard, dbError, body } from '@/lib/http';
import { audit } from '@/lib/audit';

// POST /api/prescriptions — Doctor writes a prescription with one or more medicines.
// One TRANSACTION: Prescription header + every Prescription_Medicine line.
// The BEFORE INSERT trigger on Prescription_Medicine checks and decrements stock;
// if any line is short it SIGNALs, and the whole prescription is rolled back.
export async function POST(request) {
  const { session, res } = guard(['Doctor']);
  if (res) return res;

  const b = await body(request);
  const patientId = Number(b.patientId);
  const lines = (Array.isArray(b.lines) ? b.lines : []).filter((l) => l.medicineId);

  if (!patientId || lines.length === 0) return fail(400, 'Choose at least one medicine');
  if (new Set(lines.map((l) => String(l.medicineId))).size !== lines.length) {
    return fail(400, 'Each medicine can appear only once on a prescription');
  }
  for (const l of lines) {
    if (!String(l.dosage || '').trim() || !String(l.frequency || '').trim()) return fail(400, 'Every line needs a dosage and frequency');
    if (!(Number(l.duration) > 0)) return fail(400, 'Duration must be at least 1 day');
  }
  if (!(await doctorHasPatient(session.doctorId, patientId))) {
    return fail(403, 'You can only prescribe for patients assigned to you');
  }

  try {
    const prescriptionId = await withTransaction(async (conn) => {
      const [pr] = await conn.execute(
        'INSERT INTO Prescription (Patient_ID, Doctor_ID, Prescription_Date, Notes) VALUES (?, ?, CURDATE(), ?)',
        [patientId, session.doctorId, b.notes || null]
      );
      for (const l of lines) {
        try {
          await conn.execute(
            `INSERT INTO Prescription_Medicine (Prescription_ID, Medicine_ID, Dosage, Frequency, Duration_Days)
             VALUES (?, ?, ?, ?, ?)`,
            [pr.insertId, l.medicineId, l.dosage, l.frequency, Number(l.duration)]
          );
        } catch (err) {
          if (err?.sqlState === '45000') {
            const [[m]] = await conn.execute('SELECT Medicine_Name, Stock_Quantity FROM Medicine WHERE Medicine_ID = ?', [l.medicineId]);
            err.sqlMessage = `${err.sqlMessage}: ${m?.Medicine_Name} has ${m?.Stock_Quantity} in stock, ${l.duration} needed. Nothing was saved.`;
          }
          throw err;
        }
      }
      return pr.insertId;
    });
    audit(session, 'PRESCRIBE', 'Prescription', prescriptionId, { patient_id: patientId, lines: lines.length });
    return ok({ ok: true, prescriptionId });
  } catch (err) {
    return dbError(err);
  }
}
