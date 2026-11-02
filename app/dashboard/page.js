import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/mysql';
import { tryMongo } from '@/lib/mongodb';
import { ASSIGNED_PATIENTS_SQL, assignedParams } from '@/lib/access';
import { fmtDateTime, inr } from '@/lib/format';
import { Shell, Stat, Section, DataTable, Badge, Notice } from '@/app/components/ui';

export const dynamic = 'force-dynamic';

const UPCOMING_SQL = `
  SELECT a.Appointment_ID, a.Patient_ID, p.Patient_Name, d.Doctor_Name, dep.Department_Name,
         a.Appointment_DateTime, a.Reason
  FROM Appointment a
  JOIN Patient p ON a.Patient_ID = p.Patient_ID
  JOIN Doctor d ON a.Doctor_ID = d.Doctor_ID
  JOIN Department dep ON d.Department_ID = dep.Department_ID
  WHERE a.Appointment_Status = 'Scheduled' AND a.Appointment_DateTime >= NOW()`;

export default async function Dashboard() {
  const session = getSession();
  if (!session) redirect('/login');
  const { role } = session;

  if (role === 'Admin') return <AdminDashboard session={session} />;
  if (role === 'Doctor') return <DoctorDashboard session={session} />;
  return <PatientDashboard session={session} />;
}

async function AdminDashboard({ session }) {
  const [[c], upcoming, activity] = await Promise.all([
    query(`SELECT
             (SELECT COUNT(*) FROM Patient) AS patients,
             (SELECT COUNT(*) FROM Doctor) AS doctors,
             (SELECT COUNT(*) FROM Appointment WHERE Appointment_Status = 'Scheduled' AND Appointment_DateTime >= NOW()) AS upcoming,
             (SELECT COUNT(*) FROM Admission WHERE Admission_Status = 'Admitted') AS inpatients,
             (SELECT COUNT(*) FROM Bed WHERE Status = 'Available') AS beds_free,
             (SELECT COUNT(*) FROM Bed) AS beds_total,
             (SELECT COALESCE(SUM(Amount), 0) FROM Payment WHERE Payment_Status = 'Pending') AS pending,
             (SELECT COALESCE(SUM(Amount), 0) FROM Payment WHERE Payment_Status = 'Paid') AS collected`),
    query(`${UPCOMING_SQL} ORDER BY a.Appointment_DateTime LIMIT 6`),
    tryMongo((db) => db.collection('audit_logs').find({}).sort({ ts: -1 }).limit(8).toArray()),
  ]);

  return (
    <Shell session={session} title={`Welcome, ${session.username}`} subtitle="Network overview across all hospitals">
      <div className="grid" style={{ marginTop: 12 }}>
        <Stat label="Patients" value={c.patients} />
        <Stat label="Doctors" value={c.doctors} />
        <Stat label="Upcoming appointments" value={c.upcoming} />
        <Stat label="In-patients" value={c.inpatients} />
        <Stat label="Beds free" value={`${c.beds_free} / ${c.beds_total}`} />
        <Stat label="Collected" value={inr(c.collected)} hint={`${inr(c.pending)} pending`} />
      </div>

      <div className="grid-2">
        <Section title="Next appointments" right={<a href="/appointments">All →</a>}>
          <DataTable
            rowKey="Appointment_ID"
            rows={upcoming}
            empty="Nothing scheduled."
            columns={[
              { key: 'Appointment_DateTime', label: 'When', render: (a) => fmtDateTime(a.Appointment_DateTime) },
              { key: 'Patient_Name', label: 'Patient', render: (a) => <a href={`/patients/${a.Patient_ID}`}>{a.Patient_Name}</a> },
              { key: 'Doctor_Name', label: 'Doctor' },
            ]}
          />
        </Section>
        <Section title="Recent activity" tag="MongoDB · audit_logs">
          {activity.error ? <Notice>{activity.error}</Notice> : (
            <DataTable
              rows={activity.data}
              empty="No activity yet."
              columns={[
                { key: 'ts', label: 'When', render: (l) => fmtDateTime(l.ts) },
                { key: 'user_role', label: 'Role' },
                { key: 'action', label: 'Action' },
                { key: 'entity', label: 'Record', render: (l) => (l.entity ? `${l.entity}${l.entity_id != null ? ' #' + l.entity_id : ''}` : '—') },
              ]}
            />
          )}
        </Section>
      </div>
    </Shell>
  );
}

async function DoctorDashboard({ session }) {
  const d = session.doctorId;
  const [[c], upcoming, pendingLabs, [me]] = await Promise.all([
    query(`SELECT
             (SELECT COUNT(*) FROM Appointment WHERE Doctor_ID = ? AND Appointment_Status = 'Scheduled' AND Appointment_DateTime >= NOW()) AS upcoming,
             (SELECT COUNT(*) FROM (${ASSIGNED_PATIENTS_SQL}) t) AS my_patients,
             (SELECT COUNT(*) FROM Lab_Test WHERE Doctor_ID = ? AND Test_Status = 'Ordered') AS pending_tests,
             (SELECT COUNT(*) FROM Admission WHERE Admitting_Doctor_ID = ? AND Admission_Status = 'Admitted') AS inpatients`,
      [d, ...assignedParams(d), d, d]),
    query(`${UPCOMING_SQL} AND a.Doctor_ID = ? ORDER BY a.Appointment_DateTime LIMIT 8`, [d]),
    query(`SELECT lt.Test_ID, lt.Patient_ID, p.Patient_Name, lt.Test_Name, lt.Test_Date
           FROM Lab_Test lt JOIN Patient p ON lt.Patient_ID = p.Patient_ID
           WHERE lt.Doctor_ID = ? AND lt.Test_Status = 'Ordered' ORDER BY lt.Test_Date`, [d]),
    query(`SELECT d.Doctor_Name, d.Specialization, dep.Department_Name, h.Hospital_Name
           FROM Doctor d JOIN Department dep ON d.Department_ID = dep.Department_ID
           JOIN Hospital h ON dep.Hospital_ID = h.Hospital_ID WHERE d.Doctor_ID = ?`, [d]),
  ]);

  return (
    <Shell session={session} title={`Welcome, ${me?.Doctor_Name || session.username}`} subtitle={me ? `${me.Specialization} · ${me.Department_Name} · ${me.Hospital_Name}` : ''}>
      <div className="grid" style={{ marginTop: 12 }}>
        <Stat label="Upcoming appointments" value={c.upcoming} />
        <Stat label="My patients" value={c.my_patients} />
        <Stat label="Awaiting lab results" value={c.pending_tests} />
        <Stat label="My in-patients" value={c.inpatients} />
      </div>
      <div className="grid-2">
        <Section title="My schedule" right={<a href="/appointments">Manage →</a>}>
          <DataTable
            rowKey="Appointment_ID"
            rows={upcoming}
            empty="No upcoming appointments."
            columns={[
              { key: 'Appointment_DateTime', label: 'When', render: (a) => fmtDateTime(a.Appointment_DateTime) },
              { key: 'Patient_Name', label: 'Patient', render: (a) => <a href={`/patients/${a.Patient_ID}`}>{a.Patient_Name}</a> },
              { key: 'Reason', label: 'Reason' },
            ]}
          />
        </Section>
        <Section title="Lab results to enter">
          <DataTable
            rowKey="Test_ID"
            rows={pendingLabs}
            empty="All results are in."
            columns={[
              { key: 'Test_Name', label: 'Test' },
              { key: 'Patient_Name', label: 'Patient', render: (l) => <a href={`/patients/${l.Patient_ID}`}>{l.Patient_Name}</a> },
              { key: 'Test_Date', label: 'Ordered for', render: (l) => fmtDateTime(l.Test_Date) },
            ]}
          />
        </Section>
      </div>
    </Shell>
  );
}

async function PatientDashboard({ session }) {
  const p = session.patientId;
  const [[c], upcoming, labs] = await Promise.all([
    query(`SELECT
             (SELECT COUNT(*) FROM Appointment WHERE Patient_ID = ? AND Appointment_Status = 'Scheduled' AND Appointment_DateTime >= NOW()) AS upcoming,
             (SELECT COUNT(*) FROM Prescription WHERE Patient_ID = ?) AS prescriptions,
             (SELECT COUNT(*) FROM Lab_Test WHERE Patient_ID = ?) AS tests,
             fn_outstanding_balance(?) AS outstanding`, [p, p, p, p]),
    query(`${UPCOMING_SQL} AND a.Patient_ID = ? ORDER BY a.Appointment_DateTime LIMIT 5`, [p]),
    query(`SELECT lt.Test_ID, lt.Test_Name, lt.Test_Status, lr.Result_Summary
           FROM Lab_Test lt LEFT JOIN Lab_Report lr ON lr.Test_ID = lt.Test_ID
           WHERE lt.Patient_ID = ? ORDER BY lt.Test_Date DESC LIMIT 5`, [p]),
  ]);

  return (
    <Shell session={session} title={`Welcome, ${session.username}`} subtitle="Your health at a glance"
      actions={<a href="/appointments"><button>Book appointment</button></a>}>
      <div className="grid" style={{ marginTop: 12 }}>
        <Stat label="Upcoming appointments" value={c.upcoming} />
        <Stat label="Prescriptions" value={c.prescriptions} />
        <Stat label="Lab tests" value={c.tests} />
        <Stat label="Outstanding" value={inr(c.outstanding)} />
      </div>
      <div className="grid-2">
        <Section title="Upcoming appointments" right={<a href="/appointments">All →</a>}>
          <DataTable
            rowKey="Appointment_ID"
            rows={upcoming}
            empty="No upcoming appointments."
            columns={[
              { key: 'Appointment_DateTime', label: 'When', render: (a) => fmtDateTime(a.Appointment_DateTime) },
              { key: 'Doctor_Name', label: 'Doctor' },
              { key: 'Department_Name', label: 'Department' },
            ]}
          />
        </Section>
        <Section title="Recent lab tests" right={<a href="/records">Full records →</a>}>
          <DataTable
            rowKey="Test_ID"
            rows={labs}
            empty="No lab tests yet."
            columns={[
              { key: 'Test_Name', label: 'Test' },
              { key: 'Test_Status', label: 'Status', render: (l) => <Badge status={l.Test_Status} /> },
              { key: 'Result_Summary', label: 'Result', render: (l) => l.Result_Summary || '—' },
            ]}
          />
        </Section>
      </div>
    </Shell>
  );
}
