import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/mysql';
import { ASSIGNED_PATIENTS_SQL, assignedParams } from '@/lib/access';
import { fmtDateTime } from '@/lib/format';
import { Shell, DataTable, Section, Stat, Badge } from '@/app/components/ui';
import AdmitForm from './AdmitForm';
import AdmissionActions from './AdmissionActions';

export const dynamic = 'force-dynamic';

export default async function AdmissionsPage({ searchParams }) {
  const session = getSession();
  if (!session) redirect('/login');
  if (session.role !== 'Admin' && session.role !== 'Doctor') redirect('/dashboard');

  const isDoctor = session.role === 'Doctor';
  const status = searchParams.status ?? 'Admitted';

  const [admissions, [stats], freeBeds, patients, doctors] = await Promise.all([
    query(
      `SELECT ad.Admission_ID, ad.Patient_ID, p.Patient_Name, ad.Admitting_Doctor_ID, d.Doctor_Name,
              b.Bed_Number, b.Ward_Type, h.Hospital_Name, dep.Department_Name,
              ad.Admission_Date, ad.Discharge_Date, ad.Diagnosis, ad.Admission_Status,
              DATEDIFF(COALESCE(ad.Discharge_Date, NOW()), ad.Admission_Date) AS Days
       FROM Admission ad
       JOIN Patient p      ON ad.Patient_ID = p.Patient_ID
       JOIN Doctor d       ON ad.Admitting_Doctor_ID = d.Doctor_ID
       JOIN Bed b          ON ad.Bed_ID = b.Bed_ID
       JOIN Hospital h     ON b.Hospital_ID = h.Hospital_ID
       JOIN Department dep ON b.Department_ID = dep.Department_ID
       WHERE (? = '' OR ad.Admission_Status = ?)
       ${isDoctor ? 'AND ad.Admitting_Doctor_ID = ?' : ''}
       ORDER BY ad.Admission_Date DESC`,
      isDoctor ? [status, status, session.doctorId] : [status, status]
    ),
    query(`SELECT
             (SELECT COUNT(*) FROM Admission WHERE Admission_Status = 'Admitted') AS current_in,
             (SELECT ROUND(AVG(DATEDIFF(Discharge_Date, Admission_Date)), 1)
                FROM Admission WHERE Discharge_Date IS NOT NULL) AS avg_stay,
             (SELECT COUNT(*) FROM Bed WHERE Status = 'Available') AS free_beds,
             (SELECT COUNT(*) FROM Admission WHERE Admission_Date >= CURDATE() - INTERVAL 30 DAY) AS last30`),
    query(`SELECT b.Bed_ID, CONCAT(h.Hospital_Name, ' · ', dep.Department_Name, ' · ', b.Bed_Number, ' (', b.Ward_Type, ')') AS Label
           FROM Bed b
           JOIN Hospital h ON b.Hospital_ID = h.Hospital_ID
           JOIN Department dep ON b.Department_ID = dep.Department_ID
           WHERE b.Status = 'Available'
           ORDER BY h.Hospital_Name, dep.Department_Name, b.Bed_Number`),
    // Patients not currently admitted (NOT EXISTS); doctors only see their own patients
    query(
      `SELECT p.Patient_ID, p.Patient_Name FROM Patient p
       WHERE NOT EXISTS (SELECT 1 FROM Admission a WHERE a.Patient_ID = p.Patient_ID AND a.Admission_Status = 'Admitted')
       ${isDoctor ? `AND p.Patient_ID IN (${ASSIGNED_PATIENTS_SQL})` : ''}
       ORDER BY p.Patient_Name`,
      isDoctor ? assignedParams(session.doctorId) : []
    ),
    isDoctor ? Promise.resolve([]) : query('SELECT Doctor_ID, Doctor_Name, Specialization FROM Doctor ORDER BY Doctor_Name'),
  ]);

  const FILTERS = [['Admitted', 'Currently admitted'], ['Discharged', 'Discharged'], ['', 'All']];

  return (
    <Shell session={session} title="Admissions" subtitle="Admit and discharge in-patients. Bed status is updated automatically by database triggers.">
      <div className="grid" style={{ marginTop: 12 }}>
        <Stat label="Currently admitted" value={stats.current_in} />
        <Stat label="Beds available" value={stats.free_beds} />
        <Stat label="Avg length of stay" value={stats.avg_stay != null ? `${stats.avg_stay} days` : '—'} hint="AVG(DATEDIFF) over discharged" />
        <Stat label="Admissions (30 days)" value={stats.last30} />
      </div>

      <AdmitForm
        isDoctor={isDoctor}
        patients={patients.map((p) => ({ id: p.Patient_ID, label: p.Patient_Name }))}
        beds={freeBeds.map((b) => ({ id: b.Bed_ID, label: b.Label }))}
        doctors={doctors.map((d) => ({ id: d.Doctor_ID, label: `${d.Doctor_Name} — ${d.Specialization}` }))}
      />

      <div className="filters">
        {FILTERS.map(([v, label]) => (
          <a key={label} href={`/admissions?status=${v}`}>
            <button type="button" className={status === v ? '' : 'btn-secondary'}>{label}</button>
          </a>
        ))}
      </div>

      <Section title={`${admissions.length} admission${admissions.length === 1 ? '' : 's'}`} tag="trg_after_admission_insert / _update · sp_discharge_patient">
        <DataTable
          rowKey="Admission_ID"
          rows={admissions}
          empty="No admissions in this view."
          columns={[
            { key: 'Patient_Name', label: 'Patient', render: (a) => <a href={`/patients/${a.Patient_ID}`}>{a.Patient_Name}</a> },
            { key: 'Bed_Number', label: 'Bed', render: (a) => <>{a.Bed_Number} <span className="muted small">({a.Ward_Type})</span><div className="muted small">{a.Hospital_Name} · {a.Department_Name}</div></> },
            { key: 'Doctor_Name', label: 'Doctor' },
            { key: 'Admission_Date', label: 'Admitted', render: (a) => fmtDateTime(a.Admission_Date) },
            { key: 'Days', label: 'Days' },
            { key: 'Diagnosis', label: 'Diagnosis' },
            { key: 'Admission_Status', label: 'Status', render: (a) => <><Badge status={a.Admission_Status} />{a.Discharge_Date && <div className="muted small">{fmtDateTime(a.Discharge_Date)}</div>}</> },
            {
              key: 'act', label: '',
              render: (a) => a.Admission_Status === 'Admitted' && (!isDoctor || a.Admitting_Doctor_ID === session.doctorId)
                ? <AdmissionActions id={a.Admission_ID} diagnosis={a.Diagnosis} />
                : null,
            },
          ]}
        />
      </Section>
    </Shell>
  );
}
