// Authentication helpers: JWT sessions stored in an httpOnly cookie.
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
export const COOKIE_NAME = 'hms_session';

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// Read the current session (server components & route handlers).
// Returns { userId, username, role, patientId, doctorId } or null.
export function getSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Throw a 401-style guard for API routes.
export function requireRole(session, roles) {
  if (!session) return { ok: false, status: 401, message: 'Not authenticated' };
  if (roles && !roles.includes(session.role)) {
    return { ok: false, status: 403, message: 'Forbidden for your role' };
  }
  return { ok: true };
}
