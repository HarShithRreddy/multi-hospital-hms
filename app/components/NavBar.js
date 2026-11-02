'use client';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = {
  Admin: [
    ['/dashboard', 'Dashboard'],
    ['/patients', 'Patients'],
    ['/doctors', 'Doctors'],
    ['/hospitals', 'Hospitals'],
    ['/appointments', 'Appointments'],
    ['/admissions', 'Admissions'],
    ['/beds', 'Beds'],
    ['/billing', 'Billing'],
    ['/analytics', 'Analytics'],
  ],
  Doctor: [
    ['/dashboard', 'Dashboard'],
    ['/patients', 'My Patients'],
    ['/appointments', 'Appointments'],
    ['/admissions', 'Admissions'],
    ['/doctors', 'Doctors'],
  ],
  Patient: [
    ['/dashboard', 'Dashboard'],
    ['/records', 'My Records'],
    ['/doctors', 'Find a Doctor'],
    ['/appointments', 'Appointments'],
  ],
};

export default function NavBar({ role, username }) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="nav">
      <a href="/dashboard" className="brand">🏥 Multi-Hospital HMS</a>
      <div className="nav-links">
        {(LINKS[role] || []).map(([href, label]) => (
          <a key={href} href={href} className={pathname.startsWith(href) ? 'active' : ''}>{label}</a>
        ))}
      </div>
      <span className="spacer" />
      <span className="role-pill">{role}</span>
      <span className="muted">{username}</span>
      <button className="btn-sm" onClick={logout}>Logout</button>
    </nav>
  );
}
