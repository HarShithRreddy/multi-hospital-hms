import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/mysql';
import { fmtDate, fmtDateTime, inr } from '@/lib/format';
import { Shell, DataTable, Section, Stat, Badge } from '@/app/components/ui';
import { PaymentForm, InsuranceForm, PaymentActions } from './BillingClient';

export const dynamic = 'force-dynamic';

export default async function BillingPage({ searchParams }) {
  const session = getSession();
  if (!session) redirect('/login');
  if (session.role !== 'Admin') redirect('/dashboard');

  const status = searchParams.status || '';

  const [[totals], summary, payments, policies, patients, admissions] = await Promise.all([
    query(`SELECT
             COALESCE(SUM(CASE WHEN Payment_Status = 'Paid'     THEN Amount END), 0) AS paid,
             COALESCE(SUM(CASE WHEN Payment_Status = 'Pending'  THEN Amount END), 0) AS pending,
             COALESCE(SUM(CASE WHEN Payment_Status = 'Refunded' THEN Amount END), 0) AS refunded,
             COALESCE(SUM(CASE WHEN Insurance_ID IS NOT NULL AND Payment_Status <> 'Refunded' THEN Amount END), 0) AS insured
           FROM Payment`),
    // VIEW + stored FUNCTION
    query(`SELECT v.*, fn_outstanding_balance(v.Patient_ID) AS Outstanding
           FROM vw_patient_billing v WHERE v.Num_Payments > 0
           ORDER BY v.Total_Pending DESC, v.Total_Paid DESC`),
    query(`SELECT pay.Payment_ID, pay.Patient_ID, p.Patient_Name, pay.Admission_ID, pay.Amount, pay.Payment_Date,
                  pay.Payment_Method, pay.Payment_Status, i.Provider_Name, i.Policy_Number
           FROM Payment pay
           JOIN Patient p ON pay.Patient_ID = p.Patient_ID
           LEFT JOIN Insurance i ON pay.Insurance_ID = i.Insurance_ID
           WHERE (? = '' OR pay.Payment_Status = ?)
           ORDER BY pay.Payment_Date DESC`, [status, status]),
    // correlated subquery: cover already used per policy
    query(`SELECT i.*, p.Patient_Name,
                  COALESCE((SELECT SUM(x.Amount) FROM Payment x
                             WHERE x.Insurance_ID = i.Insurance_ID AND x.Payment_Status <> 'Refunded'), 0) AS Used,
                  (CURDATE() BETWEEN i.Start_Date AND i.End_Date) AS Active
           FROM Insurance i JOIN Patient p ON i.Patient_ID = p.Patient_ID
           ORDER BY p.Patient_Name, i.End_Date DESC`),
    query('SELECT Patient_ID, Patient_Name FROM Patient ORDER BY Patient_Name'),
    query(`SELECT ad.Admission_ID, ad.Patient_ID, ad.Admission_Date, ad.Admission_Status FROM Admission ad ORDER BY ad.Admission_Date DESC`),
  ]);

  return (
    <Shell session={session} title="Billing & insurance" subtitle="Payments, outstanding balances and insurance cover across the network.">
      <div className="grid" style={{ marginTop: 12 }}>
        <Stat label="Collected" value={inr(totals.paid)} />
        <Stat label="Pending" value={inr(totals.pending)} />
        <Stat label="Billed to insurance" value={inr(totals.insured)} />
        <Stat label="Refunded" value={inr(totals.refunded)} />
      </div>

      <PaymentForm
        patients={patients.map((p) => ({ id: p.Patient_ID, label: p.Patient_Name }))}
        admissions={admissions.map((a) => ({ id: a.Admission_ID, patientId: a.Patient_ID, label: `#${a.Admission_ID} · ${fmtDate(a.Admission_Date)} (${a.Admission_Status})` }))}
        policies={policies.filter((p) => p.Active).map((p) => ({
          id: p.Insurance_ID, patientId: p.Patient_ID,
          label: `${p.Provider_Name} ${p.Policy_Number} — ${inr(p.Coverage_Amount - p.Used)} left`,
        }))}
      />

      <Section title="Outstanding by patient" tag="VIEW vw_patient_billing · fn_outstanding_balance()">
        <DataTable
          rowKey="Patient_ID"
          rows={summary}
          columns={[
            { key: 'Patient_Name', label: 'Patient', render: (s) => <a href={`/patients/${s.Patient_ID}`}>{s.Patient_Name}</a> },
            { key: 'Num_Payments', label: 'Payments' },
            { key: 'Total_Paid', label: 'Paid', render: (s) => inr(s.Total_Paid) },
            { key: 'Outstanding', label: 'Outstanding', render: (s) => <strong style={{ color: Number(s.Outstanding) > 0 ? '#b45309' : undefined }}>{inr(s.Outstanding)}</strong> },
          ]}
        />
      </Section>

      <Section
        title="Payments"
        right={
          <form method="get" className="actions">
            <select name="status" defaultValue={status} style={{ width: 'auto' }}>
              <option value="">All statuses</option><option>Paid</option><option>Pending</option><option>Refunded</option>
            </select>
            <button className="btn-sm">Filter</button>
          </form>
        }
      >
        <DataTable
          rowKey="Payment_ID"
          rows={payments}
          empty="No payments in this view."
          columns={[
            { key: 'Payment_ID', label: '#' },
            { key: 'Patient_Name', label: 'Patient', render: (x) => <a href={`/patients/${x.Patient_ID}`}>{x.Patient_Name}</a> },
            { key: 'Payment_Date', label: 'Date', render: (x) => fmtDateTime(x.Payment_Date) },
            { key: 'Amount', label: 'Amount', render: (x) => inr(x.Amount) },
            { key: 'Payment_Method', label: 'Method' },
            { key: 'Provider_Name', label: 'Insurance', render: (x) => (x.Provider_Name ? `${x.Provider_Name} (${x.Policy_Number})` : '—') },
            { key: 'Admission_ID', label: 'Admission', render: (x) => (x.Admission_ID ? `#${x.Admission_ID}` : '—') },
            { key: 'Payment_Status', label: 'Status', render: (x) => <Badge status={x.Payment_Status} /> },
            { key: 'act', label: '', render: (x) => <PaymentActions id={x.Payment_ID} status={x.Payment_Status} /> },
          ]}
        />
      </Section>

      <Section title="Insurance policies" tag="CHECK (End_Date >= Start_Date)" right={<InsuranceForm patients={patients.map((p) => ({ id: p.Patient_ID, label: p.Patient_Name }))} />}>
        <DataTable
          rowKey="Insurance_ID"
          rows={policies}
          empty="No policies on file."
          columns={[
            { key: 'Patient_Name', label: 'Patient' },
            { key: 'Provider_Name', label: 'Provider' },
            { key: 'Policy_Number', label: 'Policy no.' },
            { key: 'Coverage_Amount', label: 'Cover', render: (i) => inr(i.Coverage_Amount) },
            { key: 'Used', label: 'Used', render: (i) => inr(i.Used) },
            { key: 'left', label: 'Remaining', render: (i) => inr(i.Coverage_Amount - i.Used) },
            { key: 'End_Date', label: 'Valid', render: (i) => `${fmtDate(i.Start_Date)} – ${fmtDate(i.End_Date)}` },
            { key: 'Active', label: 'Status', render: (i) => <span className={`badge ${i.Active ? 'ok' : 'muted'}`}>{i.Active ? 'Active' : 'Expired / future'}</span> },
          ]}
        />
      </Section>
    </Shell>
  );
}
