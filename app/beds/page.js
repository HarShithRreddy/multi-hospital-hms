import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/mysql';
import { Shell, DataTable, Section, Badge } from '@/app/components/ui';
import BedControls, { AddBedForm } from './BedControls';

export const dynamic = 'force-dynamic';

export default async function BedsPage({ searchParams }) {
  const session = getSession();
  if (!session) redirect('/login');
  if (session.role !== 'Admin') redirect('/dashboard');

  const hospital = searchParams.hospital || '';
  const status = searchParams.status || '';
  const ward = searchParams.ward || '';

  const [beds, utilisation, occupants, hospitals, wards, departments] = await Promise.all([
    // VIEW vw_bed_availability, filtered
    query(`SELECT * FROM vw_bed_availability
           WHERE (? = '' OR Hospital_Name = ?) AND (? = '' OR Status = ?) AND (? = '' OR Ward_Type = ?)
           ORDER BY Hospital_Name, Department_Name, Bed_Number`,
      [hospital, hospital, status, status, ward, ward]),
    // CASE inside aggregates: utilisation per hospital
    query(`SELECT h.Hospital_Name,
                  SUM(CASE WHEN b.Status = 'Occupied'    THEN 1 ELSE 0 END) AS Occupied,
                  SUM(CASE WHEN b.Status = 'Available'   THEN 1 ELSE 0 END) AS Available,
                  SUM(CASE WHEN b.Status = 'Maintenance' THEN 1 ELSE 0 END) AS Maintenance,
                  COUNT(*) AS Total,
                  ROUND(100 * SUM(CASE WHEN b.Status = 'Occupied' THEN 1 ELSE 0 END) / COUNT(*)) AS Pct
           FROM Hospital h JOIN Bed b ON h.Hospital_ID = b.Hospital_ID
           GROUP BY h.Hospital_ID, h.Hospital_Name ORDER BY h.Hospital_Name`),
    query(`SELECT ad.Bed_ID, p.Patient_ID, p.Patient_Name FROM Admission ad
           JOIN Patient p ON ad.Patient_ID = p.Patient_ID WHERE ad.Admission_Status = 'Admitted'`),
    query('SELECT Hospital_Name FROM Hospital ORDER BY Hospital_Name'),
    query('SELECT DISTINCT Ward_Type FROM Bed ORDER BY Ward_Type'),
    query(`SELECT dep.Department_ID, CONCAT(h.Hospital_Name, ' — ', dep.Department_Name) AS Label
           FROM Department dep JOIN Hospital h ON dep.Hospital_ID = h.Hospital_ID ORDER BY Label`),
  ]);

  const occ = Object.fromEntries(occupants.map((o) => [o.Bed_ID, o]));

  return (
    <Shell session={session} title="Beds" subtitle="Live bed availability. Occupied/Available changes happen automatically on admit and discharge.">
      <Section title="Utilisation by hospital" tag="CASE + GROUP BY">
        <DataTable
          rows={utilisation}
          rowKey="Hospital_Name"
          columns={[
            { key: 'Hospital_Name', label: 'Hospital' },
            { key: 'Occupied', label: 'Occupied' },
            { key: 'Available', label: 'Available' },
            { key: 'Maintenance', label: 'Maintenance' },
            { key: 'Total', label: 'Total' },
            { key: 'Pct', label: 'Occupancy', render: (u) => `${u.Pct}%` },
          ]}
        />
      </Section>

      <AddBedForm departments={departments.map((d) => ({ id: d.Department_ID, label: d.Label }))} />

      <form className="filters" method="get">
        <div><label>Hospital</label>
          <select name="hospital" defaultValue={hospital}>
            <option value="">All</option>
            {hospitals.map((h) => <option key={h.Hospital_Name}>{h.Hospital_Name}</option>)}
          </select>
        </div>
        <div><label>Status</label>
          <select name="status" defaultValue={status}>
            <option value="">All</option><option>Available</option><option>Occupied</option><option>Maintenance</option>
          </select>
        </div>
        <div><label>Ward</label>
          <select name="ward" defaultValue={ward}>
            <option value="">All</option>
            {wards.map((w) => <option key={w.Ward_Type}>{w.Ward_Type}</option>)}
          </select>
        </div>
        <button>Filter</button>
        {(hospital || status || ward) && <a href="/beds" className="muted">Clear</a>}
      </form>

      <Section title={`${beds.length} bed${beds.length === 1 ? '' : 's'}`} tag="VIEW vw_bed_availability">
        <DataTable
          rowKey="Bed_ID"
          rows={beds}
          empty="No beds match these filters."
          columns={[
            { key: 'Bed_Number', label: 'Bed' },
            { key: 'Ward_Type', label: 'Ward' },
            { key: 'Department_Name', label: 'Department' },
            { key: 'Hospital_Name', label: 'Hospital' },
            { key: 'Status', label: 'Status', render: (b) => <Badge status={b.Status} /> },
            { key: 'occ', label: 'Occupant', render: (b) => (occ[b.Bed_ID] ? <a href={`/patients/${occ[b.Bed_ID].Patient_ID}`}>{occ[b.Bed_ID].Patient_Name}</a> : '—') },
            { key: 'act', label: '', render: (b) => (b.Status === 'Occupied' ? null : <BedControls id={b.Bed_ID} status={b.Status} />) },
          ]}
        />
      </Section>
    </Shell>
  );
}
