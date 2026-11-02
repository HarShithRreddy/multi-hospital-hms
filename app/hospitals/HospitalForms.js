'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { send } from '@/app/components/api';

export default function HospitalForms({ hospitals, departments }) {
  const [mode, setMode] = useState(null);
  return (
    <div style={{ marginTop: 16 }}>
      <div className="actions">
        <button className={mode === 'dept' ? '' : 'btn-secondary'} onClick={() => setMode(mode === 'dept' ? null : 'dept')}>+ Department</button>
        <button className={mode === 'staff' ? '' : 'btn-secondary'} onClick={() => setMode(mode === 'staff' ? null : 'staff')}>+ Staff member</button>
        <button className={mode === 'nurse' ? '' : 'btn-secondary'} onClick={() => setMode(mode === 'nurse' ? null : 'nurse')}>+ Nurse</button>
      </div>
      {mode === 'dept' && <DeptForm hospitals={hospitals} />}
      {mode === 'staff' && <StaffForm hospitals={hospitals} />}
      {mode === 'nurse' && <NurseForm departments={departments} />}
    </div>
  );
}

function useForm(initial, url) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await send(url, 'POST', f);
      setMsg({ ok: true, text: 'Saved.' });
      setF(initial);
      router.refresh();
    } catch (e2) {
      setMsg({ ok: false, text: e2.message });
    }
  }
  return { f, set, submit, msg };
}

const Msg = ({ msg }) => (msg ? <div className={msg.ok ? 'ok-msg' : 'err'}>{msg.text}</div> : null);

function DeptForm({ hospitals }) {
  const { f, set, submit, msg } = useForm({ hospitalId: '', name: '', location: '' }, '/api/departments');
  return (
    <form className="card form-card" style={{ marginTop: 10 }} onSubmit={submit}>
      <h3>New department</h3>
      <p className="muted small">Department names are unique within a hospital (UNIQUE constraint).</p>
      <div className="row">
        <div><label>Hospital*</label>
          <select value={f.hospitalId} onChange={set('hospitalId')}>
            <option value="">Select…</option>
            {hospitals.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
          </select>
        </div>
        <div><label>Department name*</label><input value={f.name} onChange={set('name')} /></div>
        <div><label>Location</label><input value={f.location} onChange={set('location')} placeholder="Block A, Floor 2" /></div>
      </div>
      <button style={{ marginTop: 12 }}>Save department</button>
      <Msg msg={msg} />
    </form>
  );
}

function StaffForm({ hospitals }) {
  const { f, set, submit, msg } = useForm({ type: 'staff', hospitalId: '', name: '', role: '', phone: '', email: '' }, '/api/staff');
  return (
    <form className="card form-card" style={{ marginTop: 10 }} onSubmit={submit}>
      <h3>New staff member</h3>
      <div className="row">
        <div><label>Hospital*</label>
          <select value={f.hospitalId} onChange={set('hospitalId')}>
            <option value="">Select…</option>
            {hospitals.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
          </select>
        </div>
        <div><label>Name*</label><input value={f.name} onChange={set('name')} /></div>
        <div><label>Role*</label><input value={f.role} onChange={set('role')} placeholder="Receptionist, Pharmacist…" /></div>
      </div>
      <div className="row">
        <div><label>Phone</label><input value={f.phone} onChange={set('phone')} /></div>
        <div><label>Email</label><input value={f.email} onChange={set('email')} /></div>
      </div>
      <button style={{ marginTop: 12 }}>Save staff member</button>
      <Msg msg={msg} />
    </form>
  );
}

function NurseForm({ departments }) {
  const { f, set, submit, msg } = useForm({ type: 'nurse', departmentId: '', name: '', qualification: '', phone: '' }, '/api/staff');
  return (
    <form className="card form-card" style={{ marginTop: 10 }} onSubmit={submit}>
      <h3>New nurse</h3>
      <div className="row">
        <div><label>Department*</label>
          <select value={f.departmentId} onChange={set('departmentId')}>
            <option value="">Select…</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div><label>Name*</label><input value={f.name} onChange={set('name')} /></div>
        <div><label>Qualification</label><input value={f.qualification} onChange={set('qualification')} placeholder="B.Sc Nursing" /></div>
        <div><label>Phone</label><input value={f.phone} onChange={set('phone')} /></div>
      </div>
      <button style={{ marginTop: 12 }}>Save nurse</button>
      <Msg msg={msg} />
    </form>
  );
}
