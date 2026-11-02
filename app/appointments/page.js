import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/mysql';
import { Shell } from '@/app/components/ui';
import AppointmentsClient from './AppointmentsClient';

export const dynamic = 'force-dynamic';

export default async function AppointmentsPage({ searchParams }) {
  const session = getSession();
  if (!session) redirect('/login');

  const [doctors, patients] = await Promise.all([
    query(`SELECT d.Doctor_ID, d.Doctor_Name, d.Specialization, h.Hospital_Name
           FROM Doctor d
           JOIN Department dep ON d.Department_ID = dep.Department_ID
           JOIN Hospital h ON dep.Hospital_ID = h.Hospital_ID
           ORDER BY d.Doctor_Name`),
    session.role === 'Admin' ? query('SELECT Patient_ID, Patient_Name FROM Patient ORDER BY Patient_Name') : Promise.resolve([]),
  ]);

  const subtitle = {
    Patient: 'Book a visit and manage your appointments.',
    Doctor: 'Your schedule. Mark visits completed or no-show.',
    Admin: 'All appointments across the network.',
  }[session.role];

  return (
    <Shell session={session} title="Appointments" subtitle={subtitle}>
      <AppointmentsClient
        role={session.role}
        doctors={doctors.map((d) => ({ id: d.Doctor_ID, label: `${d.Doctor_Name} — ${d.Specialization} (${d.Hospital_Name})` }))}
        patients={patients.map((p) => ({ id: p.Patient_ID, label: p.Patient_Name }))}
        initialDoctor={searchParams.doctor || ''}
        initialPatient={searchParams.patient || ''}
      />
    </Shell>
  );
}
