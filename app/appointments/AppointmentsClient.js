'use client';
import { useEffect, useState, useCallback } from 'react';
import { send } from '@/app/components/api';
import { fmtDateTime, badgeClass } from '@/lib/format';

export default function AppointmentsClient({ role, doctors, patients, initialDoctor, initialPatient }) {
  const [list, setList] = useState([]);
  const [view, setView] = useState('upcoming');
  const [loaded, setLoaded] = useState(false);
  const canBook = role === 'Patient' || role === 'Admin';

  const load = useCallback(async () => {
    const res = await fetch('/api/appointments');
    if (res.ok) setList((await res.json()).appointments);
    setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  const now = Date.now();
  const shown = list.filter((a) => {
    const t = new Date(a.Appointment_DateTime).getTime();
    if (view === 'upcoming') return a.Appointment_Status === 'Scheduled' && t >= now - 3600 * 1000;
    if (view === 'past') return !(a.Appointment_Status === 'Scheduled' && t >= now - 3600 * 1000);
    return true;
  });
  if (view === 'upcoming') shown.reverse(); // soonest first

  return (
    <>
      {canBook && <BookForm role={role} doctors={doctors} patients={patients} onBooked={load} initialDoctor={initialDoctor} initialPatient={initialPatient} />}

      <div className="filters">
        {[['upcoming', 'Upcoming'], ['past', 'Past & closed'], ['all', 'All']].map(([v, label]) => (
          <button key={v} type="button" className={view === v ? '' : 'btn-secondary'} onClick={() => setView(v)}>{label}</button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>When</th>
              {role !== 'Patient' && <th>Patient</th>}
              {role !== 'Doctor' && <th>Doctor</th>}
              <th>Department</th><th>Reason</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a) => (
              <tr key={a.Appointment_ID}>
                <td>{a.Appointment_ID}</td>
                <td>{fmtDateTime(a.Appointment_DateTime)}</td>
                {role !== 'Patient' && <td><a href={`/patients/${a.Patient_ID}`}>{a.Patient_Name}</a></td>}
                {role !== 'Doctor' && <td>{a.Doctor_Name}</td>}
                <td>{a.Department_Name}<div className="muted small">{a.Hospital_Name}</div></td>
                <td>{a.Reason || '—'}</td>
                <td><span className={`badge ${badgeClass(a.Appointment_Status)}`}>{a.Appointment_Status}</span></td>
                <td>{a.Appointment_Status === 'Scheduled' && <StatusActions role={role} id={a.Appointment_ID} onDone={load} />}</td>
              </tr>
            ))}
            {loaded && shown.length === 0 && (
              <tr><td colSpan={8} className="muted">No appointments in this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusActions({ role, id, onDone }) {
  const [err, setErr] = useState('');
  async function set(status) {
    setErr('');
    try {
      await send(`/api/appointments/${id}`, 'PATCH', { status });
      onDone();
    } catch (e) {
      setErr(e.message);
    }
  }
  return (
    <div>
      <div className="actions">
        {role !== 'Patient' && <button className="btn-sm btn-ok" onClick={() => set('Completed')}>Complete</button>}
        {role !== 'Patient' && <button className="btn-sm btn-secondary" onClick={() => set('No-Show')}>No-show</button>}
        <button className="btn-sm btn-danger" onClick={() => set('Cancelled')}>Cancel</button>
      </div>
      {err && <div className="err">{err}</div>}
    </div>
  );
}

function BookForm({ role, doctors, patients, onBooked, initialDoctor, initialPatient }) {
  const [f, setF] = useState({ patientId: initialPatient, doctorId: initialDoctor, datetime: '', reason: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const data = await send('/api/appointments', 'POST', f);
      setMsg({ ok: true, text: `Booked appointment #${data.appointmentId} (via stored procedure sp_book_appointment).` });
      setF({ ...f, datetime: '', reason: '' });
      onBooked();
    } catch (e2) {
      setMsg({ ok: false, text: e2.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form-card" style={{ marginTop: 12 }} onSubmit={submit}>
      <h3>Book an appointment</h3>
      <div className="row">
        {role === 'Admin' && (
          <div><label>Patient*</label>
            <select value={f.patientId} onChange={set('patientId')}>
              <option value="">Select…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
        )}
        <div style={{ flex: 2 }}><label>Doctor*</label>
          <select value={f.doctorId} onChange={set('doctorId')}>
            <option value="">Select…</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div><label>Date &amp; time*</label><input type="datetime-local" value={f.datetime} onChange={set('datetime')} /></div>
      </div>
      <label>Reason</label>
      <input value={f.reason} onChange={set('reason')} placeholder="e.g. follow-up, fever" />
      <div className="actions" style={{ marginTop: 12 }}>
        <button disabled={busy}>{busy ? 'Booking…' : 'Book'}</button>
        <a href="/doctors" className="muted" style={{ alignSelf: 'center' }}>Browse doctors →</a>
      </div>
      {msg && <div className={msg.ok ? 'ok-msg' : 'err'}>{msg.text}</div>}
    </form>
  );
}
