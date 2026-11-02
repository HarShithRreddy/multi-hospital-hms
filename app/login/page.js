'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || 'Login failed');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setErr('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>🏥 HMS Login</h1>
        <p className="muted" style={{ textAlign: 'center' }}>Multi-Hospital Healthcare Management</p>
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. admin" autoFocus />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button style={{ width: '100%', marginTop: 16 }} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        {err && <div className="err">{err}</div>}
        <p className="muted" style={{ textAlign: 'center', marginTop: 14 }}>
          New patient? <a href="/register">Create an account</a>
        </p>
        <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
          Demo: admin / Admin@123 · dr_mehta / Doctor@123 · patient_rajesh / Patient@123
        </p>
      </form>
    </div>
  );
}
