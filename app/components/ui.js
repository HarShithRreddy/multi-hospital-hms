// Presentational building blocks used by server-rendered pages.
import NavBar from './NavBar';
import { badgeClass } from '@/lib/format';

export function Shell({ session, title, subtitle, actions, children }) {
  return (
    <>
      <NavBar role={session.role} username={session.username} />
      <div className="container">
        <div className="page-head">
          <div>
            <h1>{title}</h1>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function Badge({ status }) {
  return <span className={`badge ${badgeClass(status)}`}>{status}</span>;
}

export function Section({ title, tag, children, right }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>
          {title}
          {tag && <span className="tag">{tag}</span>}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

// columns: [{ key, label, render? }]
export function DataTable({ columns, rows, empty = 'Nothing to show.', rowKey }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey ? r[rowKey] : i}>
              {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="muted">{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Notice({ children }) {
  return <div className="notice">{children}</div>;
}
