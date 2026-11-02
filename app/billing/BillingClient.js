'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { send } from '@/app/components/api';

const Msg = ({ msg }) => (msg ? <div className={msg.ok ? 'ok-msg' : 'err'}>{msg.text}</div> : null);

export function PaymentForm({ patients, admissions, policies }) {
  const router = useRouter();
  const empty = { patientId: '', admissionId: '', insuranceId: '', amount: '', method: 'UPI', status: 'Paid' };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pid = Number(f.patientId);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await send('/api/payments', 'POST', f);
      setMsg({ ok: true, text: `Payment #${r.paymentId} recorded.` });
      setF(empty);
      router.refresh();
    } catch (e2) {
      setMsg({ ok: false, text: e2.message });
    }
  }

  if (!open) return <button style={{ marginTop: 16 }} onClick={() => setOpen(true)}>+ Record payment</button>;
  return (
    <form className="card form-card" style={{ marginTop: 16 }} onSubmit={submit}>
      <h3>Record a payment</h3>
      <p className="muted small">If you bill insurance, the server checks — in a transaction — that the policy belongs to the patient, is valid today and has enough cover left.</p>
      <div className="row">
        <div><label>Patient*</label>
          <select value={f.patientId} onChange={(e) => setF({ ...f, patientId: e.target.value, admissionId: '', insuranceId: '' })}>
            <option value="">Select…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div><label>Amount (₹)*</label><input type="number" min="1" step="0.01" value={f.amount} onChange={set('amount')} /></div>
        <div><label>Method*</label>
          <select value={f.method} onChange={set('method')}>
            <option>UPI</option><option>Card</option><option>Cash</option><option>Net Banking</option><option>Insurance</option>
          </select>
        </div>
        <div><label>Status*</label>
          <select value={f.status} onChange={set('status')}>
            <option>Paid</option><option>Pending</option>
          </select>
        </div>
      </div>
      <div className="row">
        <div><label>For admission (optional)</label>
          <select value={f.admissionId} onChange={set('admissionId')} disabled={!pid}>
            <option value="">None / outpatient</option>
            {admissions.filter((a) => a.patientId === pid).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
        <div><label>Bill to insurance (optional)</label>
          <select value={f.insuranceId} onChange={set('insuranceId')} disabled={!pid}>
            <option value="">No insurance</option>
            {policies.filter((p) => p.patientId === pid).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <div className="actions" style={{ marginTop: 12 }}>
        <button>Save payment</button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Close</button>
      </div>
      <Msg msg={msg} />
    </form>
  );
}

export function InsuranceForm({ patients }) {
  const router = useRouter();
  const empty = { patientId: '', provider: '', policyNumber: '', coverage: '', startDate: '', endDate: '' };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await send('/api/insurance', 'POST', f);
      setMsg({ ok: true, text: 'Policy added.' });
      setF(empty);
      router.refresh();
    } catch (e2) {
      setMsg({ ok: false, text: e2.message });
    }
  }

  if (!open) return <button className="btn-sm" onClick={() => setOpen(true)}>+ Add policy</button>;
  return (
    <form className="card" onSubmit={submit} style={{ width: '100%' }}>
      <div className="row">
        <div><label>Patient*</label>
          <select value={f.patientId} onChange={set('patientId')}>
            <option value="">Select…</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div><label>Provider*</label><input value={f.provider} onChange={set('provider')} placeholder="Star Health" /></div>
        <div><label>Policy number*</label><input value={f.policyNumber} onChange={set('policyNumber')} /></div>
      </div>
      <div className="row">
        <div><label>Cover (₹)*</label><input type="number" min="0" value={f.coverage} onChange={set('coverage')} /></div>
        <div><label>Start*</label><input type="date" value={f.startDate} onChange={set('startDate')} /></div>
        <div><label>End*</label><input type="date" value={f.endDate} onChange={set('endDate')} /></div>
      </div>
      <div className="actions" style={{ marginTop: 12 }}>
        <button>Save policy</button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Close</button>
      </div>
      <Msg msg={msg} />
    </form>
  );
}

export function PaymentActions({ id, status }) {
  const router = useRouter();
  const [err, setErr] = useState('');
  async function setStatus(s) {
    setErr('');
    try {
      await send(`/api/payments/${id}`, 'PATCH', { status: s });
      router.refresh();
    } catch (e) {
      setErr(e.message);
    }
  }
  return (
    <div>
      <div className="actions">
        {status === 'Pending' && <button className="btn-sm btn-ok" onClick={() => setStatus('Paid')}>Mark paid</button>}
        {status === 'Paid' && <button className="btn-sm btn-secondary" onClick={() => setStatus('Refunded')}>Refund</button>}
      </div>
      {err && <div className="err">{err}</div>}
    </div>
  );
}
