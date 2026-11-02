'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { send } from '@/app/components/api';

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({
    name: '', dob: '', gender: 'Male', bloodGroup: '', phone: '', email: '', address: '',
    emergencyContact: '', username: '', password: '', confirm: '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (f.password !== f.confirm) return setErr('Passwords do not match');
    setBusy(true);
    try {
      await send('/api/auth/register', 'POST', f);
      router.push('/dashboard');
      router.refresh();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card" style={{ width: 620, maxWidth: '100%' }} onSubmit={submit}>
        <h1 style={{ textAlign: 'center' }}>Patient registration</h1>
        <p className="muted" style={{ textAlign: 'center' }}>Create your account to book appointments and view your records.</p>

        <h3 style={{ marginTop: 16 }}>Your details</h3>
        <div className="row">
          <div><label>Full name*</label><input value={f.name} onChange={set('name')} required /></div>
          <div><label>Date of birth*</label><input type="date" value={f.dob} onChange={set('dob')} required /></div>
        </div>
        <div className="row">
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
          <div><label>Phone*</label><input value={f.phone} onChange={set('phone')} required /></div>
          <div><label>Email</label><input type="email" value={f.email} onChange={set('email')} /></div>
        </div>
        <div className="row">
          <div><label>Address</label><input value={f.address} onChange={set('address')} /></div>
          <div><label>Emergency contact number</label><input value={f.emergencyContact} onChange={set('emergencyContact')} /></div>
        </div>

        <h3 style={{ marginTop: 16 }}>Login</h3>
        <div className="row">
          <div><label>Username*</label><input value={f.username} onChange={set('username')} required /></div>
        </div>
        <div className="row">
          <div><label>Password* (min 8)</label><input type="password" value={f.password} onChange={set('password')} required /></div>
          <div><label>Confirm password*</label><input type="password" value={f.confirm} onChange={set('confirm')} required /></div>
        </div>

        <button style={{ width: '100%', marginTop: 18 }} disabled={busy}>{busy ? 'Creating account…' : 'Register'}</button>
        {err && <div className="err">{err}</div>}
        <p className="muted" style={{ textAlign: 'center', marginTop: 14 }}>
          Already registered? <a href="/login">Sign in</a>
        </p>
      </form>
    </div>
  );
}
