'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { send } from '@/app/components/api';

export default function AdmitForm({ isDoctor, patients, beds, doctors }) {
  const router = useRouter();
  const empty = { patientId: '', bedId: '', doctorId: '', diagnosis: '', deposit: '', method: 'UPI' };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const r = await send('/api/admissions', 'POST', f);
      setMsg({ ok: true, text: `Admitted (admission #${r.admissionId}). The bed is now marked Occupied by the trigger${r.paymentId ? `; deposit recorded as payment #${r.paymentId}` : ''}.` });
      setF(empty);
      router.refresh();
    } catch (e2) {
      setMsg({ ok: false, text: e2.message });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <button style={{ marginTop: 16 }} onClick={() => setOpen(true)}>+ Admit a patient</button>;

  return (
    <form className="card form-card" style={{ marginTop: 16 }} onSubmit={submit}>
      <h3>Admit a patient</h3>
      <p className="muted small">Runs as one transaction: lock the bed row, check it is free, insert the admission and (optionally) the deposit payment.</p>
      <div className="row">
        <div><label>Patient*</label>
          <select value={f.patientId} onChange={set('patientId')}>
            <option value="">{patients.length ? 'Select…' : 'No eligible patients'}</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 2 }}><label>Bed* (available only)</label>
          <select value={f.bedId} onChange={set('bedId')}>
            <option value="">{beds.length ? 'Select…' : 'No free beds'}</option>
            {beds.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </div>
        {!isDoctor && (
          <div><label>Admitting doctor*</label>
            <select value={f.doctorId} onChange={set('doctorId')}>
              <option value="">Select…</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
        )}
      </div>
      <label>Diagnosis / reason</label>
      <input value={f.diagnosis} onChange={set('diagnosis')} />
      <div className="row">
        <div><label>Advance deposit (₹, optional)</label><input type="number" min="0" value={f.deposit} onChange={set('deposit')} /></div>
        <div><label>Deposit method</label>
          <select value={f.method} onChange={set('method')}>
            <option>UPI</option><option>Card</option><option>Cash</option><option>Net Banking</option>
          </select>
        </div>
      </div>
      <div className="actions" style={{ marginTop: 12 }}>
        <button disabled={busy}>{busy ? 'Admitting…' : 'Admit'}</button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Close</button>
      </div>
      {msg && <div className={msg.ok ? 'ok-msg' : 'err'}>{msg.text}</div>}
    </form>
  );
}
