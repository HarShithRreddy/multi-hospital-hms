// Display formatting shared by server and client components.
const TZ = 'Asia/Kolkata';

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ });
}

export function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ,
  });
}

export function inr(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// Badge colour for any status value used in the schema.
export function badgeClass(status) {
  if (['Completed', 'Paid', 'Available', 'Discharged'].includes(status)) return 'ok';
  if (['Scheduled', 'Pending', 'Ordered', 'Admitted', 'Occupied'].includes(status)) return 'warn';
  if (['Cancelled', 'No-Show', 'Refunded', 'Maintenance', 'Transferred'].includes(status)) return 'bad';
  return 'muted';
}

// "2026-10-27T10:15" (datetime-local input) -> "2026-10-27 10:15:00" (MySQL DATETIME)
export function toMysqlDateTime(v) {
  if (!v) return null;
  const s = String(v).replace('T', ' ');
  return s.length === 16 ? s + ':00' : s;
}
