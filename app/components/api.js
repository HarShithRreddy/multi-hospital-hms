'use client';
// Client-side helper for calling the API routes. Throws with the server's
// error message so forms can show it (including trigger/procedure errors).
export async function send(url, method = 'POST', payload) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
