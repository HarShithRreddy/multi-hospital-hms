import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/mysql';
import { Shell, DataTable, Section } from '@/app/components/ui';
import AddDoctorForm from './AddDoctorForm';

export const dynamic = 'force-dynamic';

export default async function DoctorsPage({ searchParams }) {
  const session = getSession();
  if (!session) redirect('/login');

  const q = (searchParams.q || '').trim();
  const hospital = searchParams.hospital || '';
  const spec = searchParams.spec || '';
  const like = `%${q}%`;

  // Server-side search + filtering (JOIN across Doctor, Department, Hospital,
  // plus a correlated subquery for each doctor's upcoming load).
  const [doctors, hospitals, specs, departments] = await Promise.all([
    query(
      `SELECT d.Doctor_ID, d.Doctor_Name, d.Specialization, d.Experience_Years, d.Phone, d.Email,
              dep.Department_Name, h.Hospital_Name,
              (SELECT COUNT(*) FROM Appointment a
                WHERE a.Doctor_ID = d.Doctor_ID AND a.Appointment_Status = 'Scheduled'
                  AND a.Appointment_DateTime >= NOW()) AS Upcoming
       FROM Doctor d
       JOIN Department dep ON d.Department_ID = dep.Department_ID
       JOIN Hospital h     ON dep.Hospital_ID = h.Hospital_ID
       WHERE (d.Doctor_Name LIKE ? OR d.Specialization LIKE ? OR dep.Department_Name LIKE ?)
         AND (? = '' OR h.Hospital_ID = ?)
         AND (? = '' OR d.Specialization = ?)
       ORDER BY h.Hospital_Name, dep.Department_Name, d.Doctor_Name`,
      [like, like, like, hospital, hospital || 0, spec, spec]
    ),
    query('SELECT Hospital_ID, Hospital_Name FROM Hospital ORDER BY Hospital_Name'),
    query('SELECT DISTINCT Specialization FROM Doctor ORDER BY Specialization'),
    session.role === 'Admin'
      ? query(`SELECT dep.Department_ID, CONCAT(h.Hospital_Name, ' — ', dep.Department_Name) AS Label
               FROM Department dep JOIN Hospital h ON dep.Hospital_ID = h.Hospital_ID
               ORDER BY h.Hospital_Name, dep.Department_Name`)
      : Promise.resolve([]),
  ]);

  const canBook = session.role === 'Patient' || session.role === 'Admin';

  return (
    <Shell
      session={session}
      title={session.role === 'Patient' ? 'Find a doctor' : 'Doctors'}
      subtitle="Search by name, specialization or department, and filter by hospital."
    >
      {session.role === 'Admin' && <AddDoctorForm departments={departments} />}

      <form className="filters" method="get">
        <div style={{ flex: 2 }}>
          <label>Search</label>
          <input name="q" defaultValue={q} placeholder="e.g. Mehta, cardio, neurology" />
        </div>
        <div>
          <label>Hospital</label>
          <select name="hospital" defaultValue={hospital}>
            <option value="">All hospitals</option>
            {hospitals.map((h) => <option key={h.Hospital_ID} value={h.Hospital_ID}>{h.Hospital_Name}</option>)}
          </select>
        </div>
        <div>
          <label>Specialization</label>
          <select name="spec" defaultValue={spec}>
            <option value="">All</option>
            {specs.map((s) => <option key={s.Specialization}>{s.Specialization}</option>)}
          </select>
        </div>
        <button>Search</button>
        {(q || hospital || spec) && <a href="/doctors" className="muted">Clear</a>}
      </form>

      <Section title={`${doctors.length} doctor${doctors.length === 1 ? '' : 's'}`} tag="JOIN + correlated subquery">
        <DataTable
          rowKey="Doctor_ID"
          rows={doctors}
          empty="No doctors match your search."
          columns={[
            { key: 'Doctor_Name', label: 'Doctor' },
            { key: 'Specialization', label: 'Specialization' },
            { key: 'Department_Name', label: 'Department' },
            { key: 'Hospital_Name', label: 'Hospital' },
            { key: 'Experience_Years', label: 'Experience', render: (d) => `${d.Experience_Years} yrs` },
            { key: 'Upcoming', label: 'Upcoming appts' },
            ...(canBook
              ? [{ key: 'book', label: '', render: (d) => <a href={`/appointments?doctor=${d.Doctor_ID}`}>Book →</a> }]
              : [{ key: 'Email', label: 'Contact', render: (d) => d.Email || d.Phone || '—' }]),
          ]}
        />
      </Section>
    </Shell>
  );
}
