// Row-level access rules: who may see which patient's records.
import { query } from './mysql';

// A doctor is "assigned" to a patient if they have any clinical link:
// an appointment, an admission they admitted, a prescription or a lab test.
export const ASSIGNED_PATIENTS_SQL = `
  SELECT Patient_ID FROM Appointment  WHERE Doctor_ID = ?
  UNION SELECT Patient_ID FROM Admission    WHERE Admitting_Doctor_ID = ?
  UNION SELECT Patient_ID FROM Prescription WHERE Doctor_ID = ?
  UNION SELECT Patient_ID FROM Lab_Test     WHERE Doctor_ID = ?`;

export const assignedParams = (doctorId) => [doctorId, doctorId, doctorId, doctorId];

export async function doctorHasPatient(doctorId, patientId) {
  const rows = await query(
    `SELECT 1 FROM (${ASSIGNED_PATIENTS_SQL}) t WHERE t.Patient_ID = ? LIMIT 1`,
    [...assignedParams(doctorId), patientId]
  );
  return rows.length > 0;
}

export async function canViewPatient(session, patientId) {
  if (!session) return false;
  if (session.role === 'Admin') return true;
  if (session.role === 'Patient') return session.patientId === patientId;
  if (session.role === 'Doctor') return doctorHasPatient(session.doctorId, patientId);
  return false;
}
