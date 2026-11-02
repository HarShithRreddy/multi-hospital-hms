import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { getSession } from '@/lib/auth';

// Role-specific dashboard statistics (relational aggregates).
export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (session.role === 'Admin') {
    const [[counts]] = await Promise.all([
      query(`SELECT
                (SELECT COUNT(*) FROM Patient)     AS patients,
                (SELECT COUNT(*) FROM Doctor)      AS doctors,
                (SELECT COUNT(*) FROM Appointment WHERE Appointment_Status='Scheduled') AS upcoming,
                (SELECT COUNT(*) FROM Bed WHERE Status='Available') AS beds_free`),
    ]);
    const revenue = await query(
      `SELECT Payment_Status, SUM(Amount) AS total FROM Payment GROUP BY Payment_Status`
    );
    return NextResponse.json({ role: 'Admin', counts, revenue });
  }

  if (session.role === 'Doctor') {
    const counts = await query(
      `SELECT
         (SELECT COUNT(*) FROM Appointment WHERE Doctor_ID=? AND Appointment_Status='Scheduled') AS upcoming,
         (SELECT COUNT(DISTINCT Patient_ID) FROM Appointment WHERE Doctor_ID=?) AS my_patients,
         (SELECT COUNT(*) FROM Lab_Test WHERE Doctor_ID=? AND Test_Status='Ordered') AS pending_tests`,
      [session.doctorId, session.doctorId, session.doctorId]
    );
    return NextResponse.json({ role: 'Doctor', counts: counts[0] });
  }

  // Patient
  const counts = await query(
    `SELECT
       (SELECT COUNT(*) FROM Appointment WHERE Patient_ID=?) AS appointments,
       (SELECT COUNT(*) FROM Prescription WHERE Patient_ID=?) AS prescriptions,
       (SELECT COALESCE(SUM(Amount),0) FROM Payment WHERE Patient_ID=? AND Payment_Status='Pending') AS outstanding`,
    [session.patientId, session.patientId, session.patientId]
  );
  return NextResponse.json({ role: 'Patient', counts: counts[0] });
}
