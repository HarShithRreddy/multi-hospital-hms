'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { send } from '@/app/components/api';

const EMPTY = { name: '', dob: '', gender: 'Male', bloodGroup: '', phone: '', email: '', address: '', emergencyContact: '' };

// Admin: register a patient at the front desk.
export default function AddPatientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await send('/api/patients', 'POST', f);
      setMsg({ ok: true, text: `Registered patient #${r.patientId}` });
      setF(EMPTY);
      router.refresh();
    } catch (e2) {
      setMsg({ ok: false, text: e2.message });
    }
  }

  if (!open) return <button style={{ marginTop: 8 }} onClick={() => setOpen(true)}>+ Register patient</button>;

  return (
    <form className="card form-card" style={{ marginTop: 8 }} onSubmit={submit}>
      <h3>Register a patient</h3>
      <div className="row">
        <div><label>Name*</label><input value={f.name} onChange={set('name')} /></div>
        <div><label>Date of birth*</label><input type="date" value={f.dob} onChange={set('dob')} /></div>
        <div><label>Gender*</label>
          <select value={f.gender} onChange={set('gender')}>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </div>
        <div><label>Blood group</label>
          <select value={f.bloodGroup} onChange={set('bloodGroup')}>
            <option value="">Unknown</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div className="row">
        <div><label>Phone*</label><input value={f.phone} onChange={set('phone')} /></div>
        <div><label>Email</label><input value={f.email} onChange={set('email')} /></div>
        <div><label>Emergency contact</label><input value={f.emergencyContact} onChange={set('emergencyContact')} /></div>
      </div>
      <label>Address</label><input value={f.address} onChange={set('address')} />
      <div className="actions" style={{ marginTop: 12 }}>
        <button>Save patient</button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Close</button>
      </div>
      {msg && <div className={msg.ok ? 'ok-msg' : 'err'}>{msg.text}</div>}
    </form>
  );
}
