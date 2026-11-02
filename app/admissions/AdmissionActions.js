'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { send } from '@/app/components/api';

export default function AdmissionActions({ id, diagnosis }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dx, setDx] = useState(diagnosis || '');
  const [err, setErr] = useState('');

  async function act(payload) {
    setErr('');
    try {
      await send(`/api/admissions/${id}`, 'PATCH', payload);
      setConfirming(false);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setErr(e.message);
    }
  }

  if (editing) {
    return (
      <div style={{ minWidth: 220 }}>
        <input value={dx} onChange={(e) => setDx(e.target.value)} placeholder="Updated diagnosis / treatment" />
        <div className="actions" style={{ marginTop: 6 }}>
          <button className="btn-sm" onClick={() => act({ action: 'diagnosis', diagnosis: dx })}>Save</button>
          <button className="btn-sm btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
        </div>
        {err && <div className="err">{err}</div>}
      </div>
    );
  }

  return (
    <div>
      <div className="actions">
        <button className="btn-sm btn-secondary" onClick={() => setEditing(true)}>Update diagnosis</button>
        {confirming ? (
          <>
            <button className="btn-sm btn-danger" onClick={() => act({ action: 'discharge' })}>Confirm discharge</button>
            <button className="btn-sm btn-secondary" onClick={() => setConfirming(false)}>No</button>
          </>
        ) : (
          <button className="btn-sm btn-ok" onClick={() => setConfirming(true)}>Discharge</button>
        )}
      </div>
      {err && <div className="err">{err}</div>}
    </div>
  );
}
