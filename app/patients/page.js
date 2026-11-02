import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/mysql';
import { ASSIGNED_PATIENTS_SQL, assignedParams } from '@/lib/access';
import { fmtDate } from '@/lib/format';
import { Shell, DataTable, Section, Badge } from '@/app/components/ui';
import AddPatientForm from './PatientsClient';

export const dynamic = 'force-dynamic';

export default async function PatientsPage({ searchParams }) {
  const session = getSession();
  if (!session) redirect('/login');
  if (session.role === 'Patient') redirect('/records');
  if (session.role !== 'Admin' && session.role !== 'Doctor') redirect('/dashboard');

  const q = (searchParams.q || '').trim();
  const like = `%${q}%`;
  const isDoctor = session.role === 'Doctor';

  const patients = await query(
    `SELECT p.Patient_ID, p.Patient_Name, p.Gender, p.Blood_Group, p.Phone,
            fn_patient_age(p.Patient_ID) AS Age,
            (SELECT MAX(a.Appointment_DateTime) FROM Appointment a
              WHERE a.Patient_ID = p.Patient_ID AND a.Appointment_DateTime <= NOW()) AS Last_Visit,
            EXISTS (SELECT 1 FROM Admission ad
                     WHERE ad.Patient_ID = p.Patient_ID AND ad.Admission_Status = 'Admitted') AS Admitted
     FROM Patient p
     WHERE (p.Patient_Name LIKE ? OR p.Phone LIKE ?)
     ${isDoctor ? `AND p.Patient_ID IN (${ASSIGNED_PATIENTS_SQL})` : ''}
     ORDER BY p.Patient_Name`,
    isDoctor ? [like, like, ...assignedParams(session.doctorId)] : [like, like]
  );

  return (
    <Shell
      session={session}
      title={isDoctor ? 'My patients' : 'Patients'}
      subtitle={isDoctor
        ? 'Patients you have seen, admitted, prescribed for or ordered tests for. Open one to view the full record.'
        : 'Every registered patient across the network. Open one to view the full record.'}
    >
      {session.role === 'Admin' && <AddPatientForm />}

      <form className="filters" method="get">
        <div style={{ flex: 1, maxWidth: 420 }}>
          <label>Search</label>
          <input name="q" defaultValue={q} placeholder="Name or phone" />
        </div>
        <button>Search</button>
        {q && <a href="/patients" className="muted">Clear</a>}
      </form>

      <Section title={`${patients.length} patient${patients.length === 1 ? '' : 's'}`} tag="fn_patient_age() · EXISTS subquery">
        <DataTable
          rowKey="Patient_ID"
          rows={patients}
          empty={q ? 'No patients match your search.' : 'No patients yet.'}
          columns={[
            { key: 'Patient_ID', label: 'ID' },
            { key: 'Patient_Name', label: 'Name', render: (p) => <a href={`/patients/${p.Patient_ID}`}>{p.Patient_Name}</a> },
            { key: 'Age', label: 'Age' },
            { key: 'Gender', label: 'Gender' },
            { key: 'Blood_Group', label: 'Blood' },
            { key: 'Phone', label: 'Phone' },
            { key: 'Last_Visit', label: 'Last visit', render: (p) => fmtDate(p.Last_Visit) },
            { key: 'Admitted', label: 'Status', render: (p) => (p.Admitted ? <Badge status="Admitted" /> : <span className="muted">Outpatient</span>) },
          ]}
        />
      </Section>
    </Shell>
  );
}
