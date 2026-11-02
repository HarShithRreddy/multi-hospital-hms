// Small helpers shared by the API route handlers.
import { NextResponse } from 'next/server';
import { getSession, requireRole } from './auth';

export const ok = (data = { ok: true }) => NextResponse.json(data);
export const fail = (status, error) => NextResponse.json({ error }, { status });

// guard(['Admin','Doctor']) -> { session } or { res } (an error response to return)
export function guard(roles) {
  const session = getSession();
  const g = requireRole(session, roles);
  return g.ok ? { session } : { res: fail(g.status, g.message) };
}

// Turn database errors into messages a user can act on. Errors raised by our
// own triggers and procedures (SIGNAL SQLSTATE '45000') are shown verbatim —
// this is how database-level validation surfaces in the UI.
export function dbError(err) {
  if (err?.sqlState === '45000') return fail(400, err.sqlMessage);
  if (err?.code === 'ER_DUP_ENTRY') return fail(409, 'A record with that value already exists');
  if (err?.errno === 3819 || err?.errno === 4025) {
    return fail(400, `Rejected by a database CHECK constraint (${err.sqlMessage})`);
  }
  if (err?.code === 'ER_NO_REFERENCED_ROW_2') return fail(400, 'A referenced record does not exist');
  if (err?.code === 'ER_ROW_IS_REFERENCED_2') return fail(409, 'Other records depend on this one');
  if (err?.code === 'ER_TRUNCATED_WRONG_VALUE' || err?.code === 'ER_WRONG_VALUE') {
    return fail(400, 'One of the values has the wrong format');
  }
  console.error(err);
  return fail(500, 'Server error');
}

export async function body(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
