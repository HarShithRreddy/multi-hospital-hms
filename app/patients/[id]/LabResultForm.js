'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { send } from '@/app/components/api';

// Inline form to record a lab result. Writes the summary to MySQL (Lab_Report,
// in a transaction with the Lab_Test status change) and the detailed findings
// to MongoDB (medical_reports).
export default function LabResultForm({ testId, testName }) {
  const router = useRouter();
  const guessType = /x-ray|ct|scan|ecg/i.test(testName) ? 'Radiology' : /mri/i.test(testName) ? 'MRI' : 'Blood Test';
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ reportType: guessType, summary: '', normalRange: '', findings: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      await send(`/api/lab-tests/${testId}/report`, 'POST', f);
      setOpen(false);
      router.refresh();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  if (!open) return <button className="btn-secondary btn-sm" onClick={() => setOpen(true)}>Enter result</button>;
  return (
    <form onSubmit={submit} style={{ minWidth: 260 }}>
      <select value={f.reportType} onChange={set('reportType')}>
        <option>Blood Test</option><option>Radiology</option><option>MRI</option><option>Other</option>
      </select>
      <textarea placeholder="Result summary*" value={f.summary} onChange={set('summary')} style={{ marginTop: 6 }} />
      <input placeholder="Normal range" value={f.normalRange} onChange={set('normalRange')} style={{ marginTop: 6 }} />
      <textarea placeholder="Detailed findings (stored in MongoDB)" value={f.findings} onChange={set('findings')} style={{ marginTop: 6 }} />
      <div className="actions" style={{ marginTop: 6 }}>
        <button className="btn-sm">Save result</button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {err && <div className="err">{err}</div>}
    </form>
  );
}
