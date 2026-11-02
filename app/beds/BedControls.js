'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { send } from '@/app/components/api';

// Toggle a free bed between Available and Maintenance.
export default function BedControls({ id, status }) {
  const router = useRouter();
  const [err, setErr] = useState('');
  const next = status === 'Maintenance' ? 'Available' : 'Maintenance';

  async function change() {
    setErr('');
    try {
      await send(`/api/beds/${id}`, 'PATCH', { status: next });
      router.refresh();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <>
      <button className={`btn-sm ${next === 'Available' ? 'btn-ok' : 'btn-secondary'}`} onClick={change}>
        {next === 'Available' ? 'Mark available' : 'Send to maintenance'}
      </button>
      {err && <div className="err">{err}</div>}
    </>
  );
}

export function AddBedForm({ departments }) {
  const router = useRouter();
  const empty = { departmentId: '', bedNumber: '', wardType: 'General' };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await send('/api/beds', 'POST', f);
      setMsg({ ok: true, text: `Added bed #${r.bedId}` });
      setF(empty);
      router.refresh();
    } catch (e2) {
      setMsg({ ok: false, text: e2.message });
    }
  }

  if (!open) return <button style={{ marginTop: 20 }} onClick={() => setOpen(true)}>+ Add bed</button>;
  return (
    <form className="card form-card" style={{ marginTop: 20 }} onSubmit={submit}>
      <h3>Add a bed</h3>
      <p className="muted small">Bed numbers must be unique within a hospital (UNIQUE(Hospital_ID, Bed_Number)).</p>
      <div className="row">
        <div style={{ flex: 2 }}><label>Department*</label>
          <select value={f.departmentId} onChange={set('departmentId')}>
            <option value="">Select…</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div><label>Bed number*</label><input value={f.bedNumber} onChange={set('bedNumber')} placeholder="A-203" /></div>
        <div><label>Ward type*</label>
          <select value={f.wardType} onChange={set('wardType')}>
            <option>General</option><option>Semi-Private</option><option>Private</option><option>ICU</option><option>NICU</option>
          </select>
        </div>
      </div>
      <div className="actions" style={{ marginTop: 12 }}>
        <button>Save bed</button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Close</button>
      </div>
      {msg && <div className={msg.ok ? 'ok-msg' : 'err'}>{msg.text}</div>}
    </form>
  );
}
