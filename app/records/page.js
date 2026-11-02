import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

// "My Records" for patients is their own record page.
export default function Records() {
  const session = getSession();
  if (!session) redirect('/login');
  if (session.role === 'Patient') redirect(`/patients/${session.patientId}`);
  redirect('/patients');
}
