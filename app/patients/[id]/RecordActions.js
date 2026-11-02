'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { send } from '@/app/components/api';

// Doctor's clinical actions on a patient record.
export default function RecordActions({ patientId, medicines, appointments }) {
  const [mode, setMode] = useState(null);
  const toggle = (m) => setMode(mode === m ? null : m);
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Clinical actions</h3>
      <div className="actions">
        <button className={mode === 'rx' ? '' : 'btn-secondary'} onClick={() => toggle('rx')}>℞ Prescribe</button>
        <button className={mode === 'lab' ? '' : 'btn-secondary'} onClick={() => toggle('lab')}>🧪 Order lab test</button>
        <button className={mode === 'note' ? '' : 'btn-secondary'} onClick={() => toggle('note')}>📝 Clinical note</button>
      </div>
      {mode === 'rx' && <PrescribeForm patientId={patientId} medicines={medicines} />}
      {mode === 'lab' && <LabOrderForm patientId={patientId} />}
      {mode === 'note' && <NoteForm patientId={patientId} appointments={appointments} />}
    </div>
  );
}

const Msg = ({ msg }) => (msg ? <div className={msg.ok ? 'ok-msg' : 'err'}>{msg.text}</div> : null);
const blankLine = () => ({ medicineId: '', dosage: '1 tablet', frequency: 'Once daily', duration: 5 });

function PrescribeForm({ patientId, medicines }) {
  const router = useRouter();
  const [lines, setLines] = useState([blankLine()]);
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const setLine = (i, k) => (e) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: e.target.value } : l)));

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const r = await send('/api/prescriptions', 'POST', { patientId, notes, lines });
      setMsg({ ok: true, text: `Prescription #${r.prescriptionId} saved — stock updated by trigger.` });
      setLines([blankLine()]);
      setNotes('');
      router.refresh();
    } catch (e2) {
      setMsg({ ok: false, text: e2.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 12 }}>
      <p className="muted small">
        Each line is checked by the <code>trg_before_prescmed_insert</code> trigger: it blocks the whole prescription
        if stock is short (transaction rolls back), otherwise it decrements stock.
      </p>
      {lines.map((l, i) => (
        <div className="row" key={i}>
          <div style={{ flex: 2 }}><label>Medicine</label>
            <select value={l.medicineId} onChange={setLine(i, 'medicineId')}>
              <option value="">Select…</option>
              {medicines.map((m) => <option key={m.id} value={m.id}>{m.name} (stock {m.stock})</option>)}
            </select>
          </div>
          <div><label>Dosage</label><input value={l.dosage} onChange={setLine(i, 'dosage')} /></div>
          <div><label>Frequency</label><input value={l.frequency} onChange={setLine(i, 'frequency')} /></div>
          <div style={{ maxWidth: 110 }}><label>Days</label><input type="number" min="1" value={l.duration} onChange={setLine(i, 'duration')} /></div>
          {lines.length > 1 && (
            <div style={{ flex: 0, minWidth: 0, alignSelf: 'flex-end' }}>
              <button type="button" className="btn-danger btn-sm" onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button>
            </div>
          )}
        </div>
      ))}
      <button type="button" className="btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setLines([...lines, blankLine()])}>+ Add medicine</button>
      <label>Notes</label>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. review in 1 week" />
      <button style={{ marginTop: 12 }} disabled={busy}>{busy ? 'Saving…' : 'Save prescription'}</button>
      <Msg msg={msg} />
    </form>
  );
}

const COMMON_TESTS = ['Complete Blood Count', 'Lipid Profile', 'Blood Sugar (Fasting)', 'HbA1c', 'Liver Function Test',
  'Kidney Function Test', 'Thyroid Profile', 'Urine Routine', 'Chest X-Ray', 'ECG', 'MRI Brain', 'CT Scan'];

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function LabOrderForm({ patientId }) {
  const router = useRouter();
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState(nowLocal());
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await send('/api/lab-tests', 'POST', { patientId, testName, testDate });
      setMsg({ ok: true, text: `Lab test #${r.testId} ordered.` });
      setTestName('');
      router.refresh();
    } catch (e2) {
      setMsg({ ok: false, text: e2.message });
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 12 }}>
      <div className="row">
        <div style={{ flex: 2 }}><label>Test</label>
          <input list="common-tests" value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="Start typing…" />
          <datalist id="common-tests">{COMMON_TESTS.map((t) => <option key={t} value={t} />)}</datalist>
        </div>
        <div><label>Scheduled for</label><input type="datetime-local" value={testDate} onChange={(e) => setTestDate(e.target.value)} /></div>
      </div>
      <button style={{ marginTop: 12 }}>Order test</button>
      <Msg msg={msg} />
    </form>
  );
}

function NoteForm({ patientId, appointments }) {
  const router = useRouter();
  const empty = { appointmentId: '', chiefComplaint: '', symptoms: '', bp: '', pulse: '', temp: '', spo2: '', diagnosis: '', advice: '', followUp: '' };
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await send('/api/notes', 'POST', { patientId, ...f });
      setMsg({ ok: true, text: 'Clinical note saved to MongoDB.' });
      setF(empty);
      router.refresh();
    } catch (e2) {
      setMsg({ ok: false, text: e2.message });
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 12 }}>
      <p className="muted small">Stored as a MongoDB document — only the fields you fill in are saved, so each note can have a different shape.</p>
      <div className="row">
        <div style={{ flex: 2 }}><label>Chief complaint*</label><input value={f.chiefComplaint} onChange={set('chiefComplaint')} /></div>
        <div><label>Linked appointment</label>
          <select value={f.appointmentId} onChange={set('appointmentId')}>
            <option value="">None</option>
            {appointments.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
      </div>
      <label>Symptoms (comma separated)</label>
      <input value={f.symptoms} onChange={set('symptoms')} placeholder="fever, cough, headache" />
      <div className="row">
        <div><label>BP</label><input value={f.bp} onChange={set('bp')} placeholder="120/80" /></div>
        <div><label>Pulse</label><input type="number" value={f.pulse} onChange={set('pulse')} /></div>
        <div><label>Temp (°C)</label><input type="number" step="0.1" value={f.temp} onChange={set('temp')} /></div>
        <div><label>SpO₂ (%)</label><input type="number" value={f.spo2} onChange={set('spo2')} /></div>
      </div>
      <div className="row">
        <div style={{ flex: 2 }}><label>Provisional diagnosis</label><input value={f.diagnosis} onChange={set('diagnosis')} /></div>
        <div><label>Follow-up (days)</label><input type="number" min="0" value={f.followUp} onChange={set('followUp')} /></div>
      </div>
      <label>Advice / treatment</label>
      <textarea value={f.advice} onChange={set('advice')} />
      <button style={{ marginTop: 12 }}>Save note</button>
      <Msg msg={msg} />
    </form>
  );
}
