import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/mysql';
import { Shell, DataTable, Section, Stat } from '@/app/components/ui';
import HospitalForms from './HospitalForms';

export const dynamic = 'force-dynamic';

export default async function HospitalsPage() {
  const session = getSession();
  if (!session) redirect('/login');
  if (session.role !== 'Admin') redirect('/dashboard');

  const [hospitals, departments, staff, nurses] = await Promise.all([
    query(`SELECT h.Hospital_ID, h.Hospital_Name, h.Address, h.Phone,
                  (SELECT COUNT(*) FROM Department d WHERE d.Hospital_ID = h.Hospital_ID) AS Departments,
                  (SELECT COUNT(*) FROM Bed b WHERE b.Hospital_ID = h.Hospital_ID) AS Beds,
                  (SELECT COUNT(*) FROM Staff s WHERE s.Hospital_ID = h.Hospital_ID) AS Staff
           FROM Hospital h ORDER BY h.Hospital_Name`),
    // GROUP BY with LEFT JOINs: headcount per department (DISTINCT avoids join fan-out)
    query(`SELECT dep.Department_ID, dep.Hospital_ID, dep.Department_Name, dep.Location,
                  COUNT(DISTINCT doc.Doctor_ID) AS Doctors,
                  COUNT(DISTINCT n.Nurse_ID)    AS Nurses,
                  COUNT(DISTINCT b.Bed_ID)      AS Beds
           FROM Department dep
           LEFT JOIN Doctor doc ON doc.Department_ID = dep.Department_ID
           LEFT JOIN Nurse n    ON n.Department_ID   = dep.Department_ID
           LEFT JOIN Bed b      ON b.Department_ID   = dep.Department_ID
           GROUP BY dep.Department_ID, dep.Hospital_ID, dep.Department_Name, dep.Location
           ORDER BY dep.Department_Name`),
    query(`SELECT Staff_ID, Hospital_ID, Staff_Name, Role, Phone, Email FROM Staff ORDER BY Staff_Name`),
    query(`SELECT n.Nurse_ID, n.Nurse_Name, n.Qualification, n.Phone, dep.Hospital_ID, dep.Department_Name
           FROM Nurse n JOIN Department dep ON n.Department_ID = dep.Department_ID ORDER BY n.Nurse_Name`),
  ]);

  const deptOptions = departments.map((d) => ({
    id: d.Department_ID,
    label: `${hospitals.find((h) => h.Hospital_ID === d.Hospital_ID)?.Hospital_Name} — ${d.Department_Name}`,
  }));
  const hospitalOptions = hospitals.map((h) => ({ id: h.Hospital_ID, label: h.Hospital_Name }));

  return (
    <Shell session={session} title="Hospitals" subtitle="Departments, staff and nurses across every hospital in the network.">
      <div className="grid" style={{ marginTop: 12 }}>
        <Stat label="Hospitals" value={hospitals.length} />
        <Stat label="Departments" value={departments.length} />
        <Stat label="Nurses" value={nurses.length} />
        <Stat label="Support staff" value={staff.length} />
      </div>

      <HospitalForms hospitals={hospitalOptions} departments={deptOptions} />

      {hospitals.map((h) => (
        <Section key={h.Hospital_ID} title={h.Hospital_Name} right={<span className="muted">{h.Address} · {h.Phone}</span>}>
          <div className="grid-2">
            <div>
              <h3>Departments <span className="tag">GROUP BY + LEFT JOIN</span></h3>
              <DataTable
                rowKey="Department_ID"
                rows={departments.filter((d) => d.Hospital_ID === h.Hospital_ID)}
                columns={[
                  { key: 'Department_Name', label: 'Department' },
                  { key: 'Location', label: 'Location' },
                  { key: 'Doctors', label: 'Doctors' },
                  { key: 'Nurses', label: 'Nurses' },
                  { key: 'Beds', label: 'Beds' },
                ]}
              />
            </div>
            <div>
              <h3>Staff &amp; nurses</h3>
              <DataTable
                rows={[
                  ...staff.filter((s) => s.Hospital_ID === h.Hospital_ID)
                    .map((s) => ({ k: 's' + s.Staff_ID, name: s.Staff_Name, role: s.Role, where: '—', contact: s.Phone || s.Email })),
                  ...nurses.filter((n) => n.Hospital_ID === h.Hospital_ID)
                    .map((n) => ({ k: 'n' + n.Nurse_ID, name: n.Nurse_Name, role: `Nurse (${n.Qualification || '—'})`, where: n.Department_Name, contact: n.Phone })),
                ]}
                rowKey="k"
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'role', label: 'Role' },
                  { key: 'where', label: 'Department' },
                  { key: 'contact', label: 'Contact' },
                ]}
              />
            </div>
          </div>
        </Section>
      ))}
    </Shell>
  );
}
