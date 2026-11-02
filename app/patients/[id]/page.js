import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/mysql';
import { tryMongo } from '@/lib/mongodb';
import { canViewPatient } from '@/lib/access';
import { fmtDate, fmtDateTime, inr } from '@/lib/format';
import { Shell, DataTable, Section, Stat, Badge, Notice } from '@/app/components/ui';
import RecordActions from './RecordActions';
import LabResultForm from './LabResultForm';

export const dynamic = 'force-dynamic';

export default async function PatientRecord({ params }) {
  const session = getSession();
  if (!session) redirect('/login');
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  if (!(await canViewPatient(session, id))) redirect('/dashboard');

  const [profileRows, appointments, admissions, rxRows, labs, payments, billingRows, insurance, medicines] =
    await Promise.all([
      // Stored FUNCTION fn_patient_age + multivalued attribute via GROUP_CONCAT
      query(`SELECT p.*, fn_patient_age(p.Patient_ID) AS Age,
                    (SELECT GROUP_CONCAT(e.Contact_Number SEPARATOR ', ')
                       FROM Emergency_Contact e WHERE e.Patient_ID = p.Patient_ID) AS Emergency_Contacts
             FROM Patient p WHERE p.Patient_ID = ?`, [id]),
      // VIEW vw_patient_appointments
      query(`SELECT * FROM vw_patient_appointments WHERE Patient_ID = ? ORDER BY Appointment_DateTime DESC`, [id]),
      query(`SELECT ad.Admission_ID, ad.Admission_Date, ad.Discharge_Date, ad.Diagnosis, ad.Admission_Status,
                    b.Bed_Number, b.Ward_Type, h.Hospital_Name, d.Doctor_Name
             FROM Admission ad
             JOIN Bed b      ON ad.Bed_ID = b.Bed_ID
             JOIN Hospital h ON b.Hospital_ID = h.Hospital_ID
             JOIN Doctor d   ON ad.Admitting_Doctor_ID = d.Doctor_ID
             WHERE ad.Patient_ID = ? ORDER BY ad.Admission_Date DESC`, [id]),
      // M:N Prescription <-> Medicine through Prescription_Medicine
      query(`SELECT pr.Prescription_ID, pr.Prescription_Date, pr.Notes, d.Doctor_Name,
                    m.Medicine_Name, pm.Dosage, pm.Frequency, pm.Duration_Days
             FROM Prescription pr
             JOIN Doctor d ON pr.Doctor_ID = d.Doctor_ID
             LEFT JOIN Prescription_Medicine pm ON pm.Prescription_ID = pr.Prescription_ID
             LEFT JOIN Medicine m ON m.Medicine_ID = pm.Medicine_ID
             WHERE pr.Patient_ID = ?
             ORDER BY pr.Prescription_Date DESC, pr.Prescription_ID DESC`, [id]),
      // 1:1 Lab_Test <-> Lab_Report (LEFT JOIN keeps tests without a report yet)
      query(`SELECT lt.Test_ID, lt.Test_Name, lt.Test_Date, lt.Test_Status, d.Doctor_Name,
                    lr.Report_Date, lr.Result_Summary, lr.Normal_Range
             FROM Lab_Test lt
             JOIN Doctor d ON lt.Doctor_ID = d.Doctor_ID
             LEFT JOIN Lab_Report lr ON lr.Test_ID = lt.Test_ID
             WHERE lt.Patient_ID = ? ORDER BY lt.Test_Date DESC`, [id]),
      query(`SELECT pay.*, i.Provider_Name FROM Payment pay
             LEFT JOIN Insurance i ON pay.Insurance_ID = i.Insurance_ID
             WHERE pay.Patient_ID = ? ORDER BY pay.Payment_Date DESC`, [id]),
      // VIEW vw_patient_billing + stored FUNCTION fn_outstanding_balance
      query(`SELECT v.*, fn_outstanding_balance(v.Patient_ID) AS Outstanding
             FROM vw_patient_billing v WHERE v.Patient_ID = ?`, [id]),
      query(`SELECT i.*, COALESCE((SELECT SUM(p.Amount) FROM Payment p
                                    WHERE p.Insurance_ID = i.Insurance_ID AND p.Payment_Status <> 'Refunded'), 0) AS Used
             FROM Insurance i WHERE i.Patient_ID = ? ORDER BY i.End_Date DESC`, [id]),
      session.role === 'Doctor'
        ? query('SELECT Medicine_ID, Medicine_Name, Stock_Quantity FROM Medicine ORDER BY Medicine_Name')
        : Promise.resolve([]),
    ]);

  const p = profileRows[0];
  if (!p) notFound();

  // MongoDB: variable-structure clinical documents
  const mongo = await tryMongo(async (db) => {
    const [reports, notes] = await Promise.all([
      db.collection('medical_reports').find({ patient_id: id }).sort({ report_date: -1 }).toArray(),
      db.collection('clinical_notes').find({ patient_id: id }).sort({ visit_date: -1 }).toArray(),
    ]);
    return { reports, notes };
  });

  const prescriptions = [];
  for (const r of rxRows) {
    let rx = prescriptions.find((x) => x.id === r.Prescription_ID);
    if (!rx) prescriptions.push((rx = { id: r.Prescription_ID, date: r.Prescription_Date, doctor: r.Doctor_Name, notes: r.Notes, meds: [] }));
    if (r.Medicine_Name) rx.meds.push(r);
  }

  const billing = billingRows[0] || { Total_Paid: 0, Total_Pending: 0, Outstanding: 0 };
  const isDoctor = session.role === 'Doctor';
  const canEnterResults = isDoctor || session.role === 'Admin';
  const doctorAppointments = isDoctor
    ? appointments.filter((a) => a.Doctor_ID === session.doctorId)
        .map((a) => ({ id: a.Appointment_ID, label: `#${a.Appointment_ID} · ${fmtDateTime(a.Appointment_DateTime)}` }))
    : [];

  return (
    <Shell
      session={session}
      title={session.role === 'Patient' ? 'My medical records' : p.Patient_Name}
      subtitle={`Patient #${p.Patient_ID} · ${p.Age} yrs · ${p.Gender}${p.Blood_Group ? ' · ' + p.Blood_Group : ''}`}
      actions={
        session.role !== 'Doctor' && <a href={`/appointments${session.role === 'Admin' ? '?patient=' + id : ''}`}><button>Book appointment</button></a>
      }
    >
      <div className="grid" style={{ marginTop: 12 }}>
        <Stat label="Appointments" value={appointments.length} />
        <Stat label="Prescriptions" value={prescriptions.length} />
        <Stat label="Lab tests" value={labs.length} hint={`${labs.filter((l) => l.Test_Status === 'Ordered').length} awaiting results`} />
        <Stat label="Outstanding" value={inr(billing.Outstanding)} hint="fn_outstanding_balance()" />
      </div>

      {isDoctor && (
        <RecordActions
          patientId={id}
          medicines={medicines.map((m) => ({ id: m.Medicine_ID, name: m.Medicine_Name, stock: m.Stock_Quantity }))}
          appointments={doctorAppointments}
        />
      )}

      <Section title="Profile" tag="fn_patient_age() · multivalued attribute">
        <div className="card">
          <dl className="kv">
            <dt>Date of birth</dt><dd>{fmtDate(p.Date_of_Birth)} ({p.Age} yrs)</dd>
            <dt>Phone</dt><dd>{p.Phone}</dd>
            <dt>Email</dt><dd>{p.Email || '—'}</dd>
            <dt>Address</dt><dd>{p.Address || '—'}</dd>
            <dt>Emergency contacts</dt><dd>{p.Emergency_Contacts || '—'}</dd>
          </dl>
        </div>
      </Section>

      <Section title="Appointments" tag="VIEW vw_patient_appointments">
        <DataTable
          rowKey="Appointment_ID"
          rows={appointments}
          empty="No appointments yet."
          columns={[
            { key: 'Appointment_DateTime', label: 'When', render: (a) => fmtDateTime(a.Appointment_DateTime) },
            { key: 'Doctor_Name', label: 'Doctor' },
            { key: 'Department_Name', label: 'Department' },
            { key: 'Reason', label: 'Reason' },
            { key: 'Appointment_Status', label: 'Status', render: (a) => <Badge status={a.Appointment_Status} /> },
          ]}
        />
      </Section>

      <Section title="Prescriptions" tag="M:N via Prescription_Medicine">
        {prescriptions.length === 0 && <p className="muted">No prescriptions yet.</p>}
        <div className="grid-2">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="card">
              <h3>Rx #{rx.id} · {fmtDate(rx.date)}</h3>
              <p className="muted small" style={{ marginTop: -4 }}>{rx.doctor}{rx.notes ? ' — ' + rx.notes : ''}</p>
              <DataTable
                rows={rx.meds}
                empty="No medicines on this prescription."
                columns={[
                  { key: 'Medicine_Name', label: 'Medicine' },
                  { key: 'Dosage', label: 'Dosage' },
                  { key: 'Frequency', label: 'Frequency' },
                  { key: 'Duration_Days', label: 'Days' },
                ]}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Lab tests & results" tag="1:1 Lab_Test ↔ Lab_Report">
        <DataTable
          rowKey="Test_ID"
          rows={labs}
          empty="No lab tests yet."
          columns={[
            { key: 'Test_Name', label: 'Test' },
            { key: 'Test_Date', label: 'Ordered for', render: (l) => fmtDateTime(l.Test_Date) },
            { key: 'Doctor_Name', label: 'Ordered by' },
            { key: 'Test_Status', label: 'Status', render: (l) => <Badge status={l.Test_Status} /> },
            {
              key: 'Result_Summary', label: 'Result',
              render: (l) => l.Result_Summary
                ? <>{l.Result_Summary}{l.Normal_Range && <div className="muted small">Normal: {l.Normal_Range}</div>}</>
                : (canEnterResults && l.Test_Status === 'Ordered' ? <LabResultForm testId={l.Test_ID} testName={l.Test_Name} /> : <span className="muted">Pending</span>),
            },
          ]}
        />
      </Section>

      <Section title="Medical reports" tag="MongoDB · medical_reports">
        {mongo.error ? <Notice>{mongo.error}</Notice> : (
          <>
            {mongo.data.reports.length === 0 && <p className="muted">No detailed reports stored.</p>}
            <div className="grid-2">{mongo.data.reports.map((r) => <ReportCard key={String(r._id)} r={r} />)}</div>
          </>
        )}
      </Section>

      <Section title="Clinical notes" tag="MongoDB · clinical_notes">
        {mongo.error ? <Notice>{mongo.error}</Notice> : (
          <>
            {mongo.data.notes.length === 0 && <p className="muted">No clinical notes yet.</p>}
            <div className="grid-2">{mongo.data.notes.map((n) => <NoteCard key={String(n._id)} n={n} />)}</div>
          </>
        )}
      </Section>

      <Section title="Admissions">
        <DataTable
          rowKey="Admission_ID"
          rows={admissions}
          empty="Never admitted."
          columns={[
            { key: 'Admission_Date', label: 'Admitted', render: (a) => fmtDateTime(a.Admission_Date) },
            { key: 'Discharge_Date', label: 'Discharged', render: (a) => fmtDateTime(a.Discharge_Date) },
            { key: 'Hospital_Name', label: 'Hospital' },
            { key: 'Bed_Number', label: 'Bed', render: (a) => `${a.Bed_Number} (${a.Ward_Type})` },
            { key: 'Doctor_Name', label: 'Doctor' },
            { key: 'Diagnosis', label: 'Diagnosis' },
            { key: 'Admission_Status', label: 'Status', render: (a) => <Badge status={a.Admission_Status} /> },
          ]}
        />
      </Section>

      <Section title="Billing & insurance" tag="VIEW vw_patient_billing">
        <div className="grid" style={{ marginBottom: 12 }}>
          <Stat label="Total paid" value={inr(billing.Total_Paid)} />
          <Stat label="Pending" value={inr(billing.Total_Pending)} />
          <Stat label="Insurance policies" value={insurance.length} />
        </div>
        <div className="grid-2">
          <DataTable
            rowKey="Payment_ID"
            rows={payments}
            empty="No payments."
            columns={[
              { key: 'Payment_Date', label: 'Date', render: (x) => fmtDate(x.Payment_Date) },
              { key: 'Amount', label: 'Amount', render: (x) => inr(x.Amount) },
              { key: 'Payment_Method', label: 'Method' },
              { key: 'Provider_Name', label: 'Insurance', render: (x) => x.Provider_Name || '—' },
              { key: 'Payment_Status', label: 'Status', render: (x) => <Badge status={x.Payment_Status} /> },
            ]}
          />
          <DataTable
            rowKey="Insurance_ID"
            rows={insurance}
            empty="No insurance on file."
            columns={[
              { key: 'Provider_Name', label: 'Provider' },
              { key: 'Policy_Number', label: 'Policy' },
              { key: 'Coverage_Amount', label: 'Cover left', render: (i) => `${inr(i.Coverage_Amount - i.Used)} of ${inr(i.Coverage_Amount)}` },
              { key: 'End_Date', label: 'Valid till', render: (i) => fmtDate(i.End_Date) },
            ]}
          />
        </div>
      </Section>
    </Shell>
  );
}

// Each report type has a different shape — rendered from whatever fields the document has.
function ReportCard({ r }) {
  const { _id, test_id, patient_id, doctor_id, report_type, report_date, ...rest } = r;
  return (
    <div className="card">
      <h3>{report_type || 'Report'} <span className="muted small">· test #{test_id} · {fmtDate(report_date)}</span></h3>
      {Array.isArray(r.analytes) && (
        <DataTable
          rows={r.analytes}
          columns={[
            { key: 'name', label: 'Analyte' },
            { key: 'value', label: 'Value', render: (a) => `${a.value} ${a.unit || ''}` },
            { key: 'range', label: 'Range', render: (a) => (a.ref_low != null ? `${a.ref_low}–${a.ref_high}` : '—') },
            { key: 'flag', label: 'Flag', render: (a) => <span className={`badge ${a.flag === 'Normal' ? 'ok' : 'bad'}`}>{a.flag}</span> },
          ]}
        />
      )}
      <dl className="kv" style={{ marginTop: 8 }}>
        {Object.entries(rest)
          .filter(([k]) => k !== 'analytes')
          .map(([k, v]) => (
            <FragmentKV key={k} k={k} v={showValue(v)} />
          ))}
      </dl>
      <details><summary>Raw document</summary><pre className="sql">{JSON.stringify(r, null, 2)}</pre></details>
    </div>
  );
}

function NoteCard({ n }) {
  return (
    <div className="card">
      <h3>{n.chief_complaint || 'Consultation'} <span className="muted small">· {fmtDateTime(n.visit_date)}</span></h3>
      <dl className="kv">
        {n.symptoms?.length > 0 && <FragmentKV k="Symptoms" v={n.symptoms.join(', ')} />}
        {n.vitals && <FragmentKV k="Vitals" v={Object.entries(n.vitals).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ')} />}
        {n.provisional_diagnosis && <FragmentKV k="Diagnosis" v={n.provisional_diagnosis} />}
        {n.medications_advised?.length > 0 && <FragmentKV k="Medications" v={n.medications_advised.map((m) => `${m.name} (${m.note})`).join(', ')} />}
        {n.advice && <FragmentKV k="Advice" v={n.advice} />}
        {n.follow_up_days != null && <FragmentKV k="Follow-up" v={`in ${n.follow_up_days} days`} />}
      </dl>
    </div>
  );
}

function showValue(v) {
  if (v instanceof Date) return fmtDateTime(v);
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(', ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (v && typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function FragmentKV({ k, v }) {
  return (<><dt>{k.replace(/_/g, ' ')}</dt><dd>{v}</dd></>);
}
