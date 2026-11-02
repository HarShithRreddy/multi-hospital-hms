'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { send } from '@/app/components/api';

const EMPTY = {
  name: '', departmentId: '', specialization: '', licenseNo: '', experience: '',
  phone: '', email: '', username: '', password: '',
};

export default function AddDoctorForm({ departments }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await send('/api/doctors', 'POST', f);
      setMsg({ ok: true, text: `Added doctor #${r.doctorId}${f.username ? ' with login ' + f.username : ''}` });
      setF(EMPTY);
      router.refresh();
    } catch (e2) {
      setMsg({ ok: false, text: e2.message });
    }
  }

  if (!open) return <button onClick={() => setOpen(true)} style={{ marginTop: 8 }}>+ Add doctor</button>;

  return (
    <form className="card form-card" onSubmit={submit} style={{ marginTop: 8 }}>
      <h3>Add a doctor</h3>
      <div className="row">
        <div><label>Name*</label><input value={f.name} onChange={set('name')} placeholder="Dr. …" /></div>
        <div><label>Department*</label>
          <select value={f.departmentId} onChange={set('departmentId')}>
            <option value="">Select…</option>
            {departments.map((d) => <option key={d.Department_ID} value={d.Department_ID}>{d.Label}</option>)}
          </select>
        </div>
        <div><label>Specialization*</label><input value={f.specialization} onChange={set('specialization')} /></div>
      </div>
      <div className="row">
        <div><label>License no.*</label><input value={f.licenseNo} onChange={set('licenseNo')} /></div>
        <div><label>Experience (years)</label><input type="number" min="0" value={f.experience} onChange={set('experience')} /></div>
        <div><label>Phone</label><input value={f.phone} onChange={set('phone')} /></div>
        <div><label>Email</label><input value={f.email} onChange={set('email')} /></div>
      </div>
      <div className="row">
        <div><label>Login username (optional)</label><input value={f.username} onChange={set('username')} /></div>
        <div><label>Login password (min 8)</label><input type="password" value={f.password} onChange={set('password')} /></div>
      </div>
      <div className="actions" style={{ marginTop: 12 }}>
        <button>Save doctor</button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Close</button>
      </div>
      {msg && <div className={msg.ok ? 'ok-msg' : 'err'}>{msg.text}</div>}
    </form>
  );
}
