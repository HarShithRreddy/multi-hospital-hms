import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/mysql';
import { getDb } from '@/lib/mongodb';
import { Shell, DataTable, Notice } from '@/app/components/ui';

export const dynamic = 'force-dynamic';

const SQL_REPORTS = [
  {
    title: 'Doctors per department',
    tag: 'LEFT JOIN · GROUP BY · ORDER BY',
    sql: `SELECT h.Hospital_Name AS Hospital, dep.Department_Name AS Department, COUNT(d.Doctor_ID) AS Doctors
FROM Department dep
JOIN Hospital h ON dep.Hospital_ID = h.Hospital_ID
LEFT JOIN Doctor d ON d.Department_ID = dep.Department_ID
GROUP BY h.Hospital_Name, dep.Department_ID, dep.Department_Name
ORDER BY Doctors DESC, Hospital`,
  },
  {
    title: 'Doctors with more than one appointment',
    tag: 'GROUP BY · HAVING',
    sql: `SELECT d.Doctor_Name AS Doctor, d.Specialization, COUNT(a.Appointment_ID) AS Appointments
FROM Doctor d
JOIN Appointment a ON d.Doctor_ID = a.Doctor_ID
GROUP BY d.Doctor_ID, d.Doctor_Name, d.Specialization
HAVING COUNT(a.Appointment_ID) > 1
ORDER BY Appointments DESC`,
  },
  {
    title: 'Revenue by payment status',
    tag: 'SUM · AVG · COUNT',
    sql: `SELECT Payment_Status AS Status, COUNT(*) AS Payments,
       SUM(Amount) AS Total, ROUND(AVG(Amount), 2) AS Average
FROM Payment
GROUP BY Payment_Status
ORDER BY Total DESC`,
  },
  {
    title: 'Department workload (appointments)',
    tag: '3-table JOIN · GROUP BY',
    sql: `SELECT dep.Department_Name AS Department, h.Hospital_Name AS Hospital,
       COUNT(a.Appointment_ID) AS Appointments,
       SUM(a.Appointment_Status = 'Completed') AS Completed
FROM Appointment a
JOIN Doctor d       ON a.Doctor_ID = d.Doctor_ID
JOIN Department dep ON d.Department_ID = dep.Department_ID
JOIN Hospital h     ON dep.Hospital_ID = h.Hospital_ID
GROUP BY dep.Department_ID, dep.Department_Name, h.Hospital_Name
ORDER BY Appointments DESC`,
  },
  {
    title: 'Patients older than the average patient',
    tag: 'Scalar subquery',
    sql: `SELECT Patient_Name AS Patient, TIMESTAMPDIFF(YEAR, Date_of_Birth, CURDATE()) AS Age
FROM Patient
WHERE TIMESTAMPDIFF(YEAR, Date_of_Birth, CURDATE()) >
      (SELECT AVG(TIMESTAMPDIFF(YEAR, Date_of_Birth, CURDATE())) FROM Patient)
ORDER BY Age DESC`,
  },
  {
    title: 'Patients with a pending payment',
    tag: 'Correlated subquery · EXISTS',
    sql: `SELECT p.Patient_Name AS Patient, p.Phone
FROM Patient p
WHERE EXISTS (SELECT 1 FROM Payment pay
              WHERE pay.Patient_ID = p.Patient_ID AND pay.Payment_Status = 'Pending')`,
  },
  {
    title: 'Patients with no insurance',
    tag: 'LEFT JOIN … IS NULL (anti-join)',
    sql: `SELECT p.Patient_Name AS Patient, p.Phone
FROM Patient p
LEFT JOIN Insurance i ON p.Patient_ID = i.Patient_ID
WHERE i.Insurance_ID IS NULL
ORDER BY p.Patient_Name`,
  },
  {
    title: 'Medicines in use and stock left',
    tag: 'IN subquery · aggregate',
    sql: `SELECT m.Medicine_Name AS Medicine, m.Stock_Quantity AS In_Stock,
       (SELECT COUNT(*) FROM Prescription_Medicine pm WHERE pm.Medicine_ID = m.Medicine_ID) AS Times_Prescribed
FROM Medicine m
WHERE m.Medicine_ID IN (SELECT DISTINCT Medicine_ID FROM Prescription_Medicine)
ORDER BY m.Stock_Quantity`,
  },
  {
    title: 'Appointments per month',
    tag: 'DATE_FORMAT · GROUP BY',
    sql: `SELECT DATE_FORMAT(Appointment_DateTime, '%Y-%m') AS Month,
       COUNT(*) AS Appointments,
       SUM(Appointment_Status = 'Cancelled') AS Cancelled
FROM Appointment
GROUP BY Month
ORDER BY Month`,
  },
];

const MONGO_REPORTS = [
  {
    title: 'Reports per type',
    tag: '$group · $sort',
    coll: 'medical_reports',
    pipeline: [
      { $group: { _id: '$report_type', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ],
    shape: (d) => ({ report_type: d._id ?? '—', total: d.total }),
  },
  {
    title: 'Abnormal blood results',
    tag: '$unwind nested array · $match',
    coll: 'medical_reports',
    pipeline: [
      { $match: { report_type: 'Blood Test' } },
      { $unwind: '$analytes' },
      { $match: { 'analytes.flag': { $ne: 'Normal' } } },
    ],
    shape: (d) => ({ patient_id: d.patient_id, test_id: d.test_id, analyte: d.analytes?.name, value: `${d.analytes?.value} ${d.analytes?.unit || ''}`, flag: d.analytes?.flag }),
  },
  {
    title: 'Most common symptoms in clinical notes',
    tag: '$unwind · $group · $sort',
    coll: 'clinical_notes',
    pipeline: [
      { $unwind: '$symptoms' },
      { $group: { _id: '$symptoms', notes: { $sum: 1 } } },
      { $sort: { notes: -1 } },
    ],
    shape: (d) => ({ symptom: d._id, notes: d.notes }),
  },
  {
    title: 'Activity by role (audit log)',
    tag: '$group on multiple keys',
    coll: 'audit_logs',
    pipeline: [
      { $group: { _id: { role: '$user_role', action: '$action' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ],
    shape: (d) => ({ role: d._id?.role, action: d._id?.action, count: d.count }),
  },
];

function autoColumns(rows) {
  if (!rows.length) return [{ key: 'none', label: 'Result' }];
  return Object.keys(rows[0]).map((k) => ({
    key: k,
    label: k.replace(/_/g, ' '),
    render: (r) => (r[k] instanceof Date ? r[k].toISOString().slice(0, 10) : r[k] == null ? '—' : String(r[k])),
  }));
}

export default async function AnalyticsPage() {
  const session = getSession();
  if (!session) redirect('/login');
  if (session.role !== 'Admin') redirect('/dashboard');

  const sqlResults = await Promise.all(
    SQL_REPORTS.map(async (r) => {
      try { return { ...r, rows: await query(r.sql) }; } catch (e) { return { ...r, rows: [], error: e.message }; }
    })
  );

  let mongoResults;
  let mongoDown = false;
  try {
    const db = await getDb();
    mongoResults = await Promise.all(
      MONGO_REPORTS.map(async (r) => {
        try { return { ...r, rows: (await db.collection(r.coll).aggregate(r.pipeline).toArray()).map(r.shape) }; } catch (e) { return { ...r, rows: [], error: e.message }; }
      })
    );
  } catch {
    mongoDown = true;
  }

  return (
    <Shell session={session} title="Analytics" subtitle="Live reports from both databases. Each card names the concept it demonstrates; expand it to see the exact query.">
      <h2 style={{ marginTop: 20 }}>Relational (MySQL)</h2>
      <div className="grid-2" style={{ marginTop: 10 }}>
        {sqlResults.map((r) => (
          <div key={r.title} className="card">
            <h3>{r.title} <span className="tag">{r.tag}</span></h3>
            {r.error ? <Notice>{r.error}</Notice> : <DataTable rows={r.rows} columns={autoColumns(r.rows)} empty="No rows." />}
            <details><summary>Show SQL</summary><pre className="sql">{r.sql}</pre></details>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 32 }}>Document store (MongoDB aggregation)</h2>
      {mongoDown ? <Notice>MongoDB is unavailable — start it to see these reports.</Notice> : (
        <div className="grid-2" style={{ marginTop: 10 }}>
          {mongoResults.map((r) => (
            <div key={r.title} className="card">
              <h3>{r.title} <span className="tag">{r.tag}</span></h3>
              {r.error ? <Notice>{r.error}</Notice> : <DataTable rows={r.rows} columns={autoColumns(r.rows)} empty="No documents." />}
              <details><summary>Show pipeline</summary><pre className="sql">{`db.${r.coll}.aggregate(${JSON.stringify(r.pipeline, null, 2)})`}</pre></details>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
