// Append-only activity trail stored in MongoDB (audit_logs collection).
// Fire-and-forget: a MongoDB outage never blocks or fails the user's action.
import { getDb } from './mongodb';

export function audit(session, action, entity, entityId, details) {
  getDb()
    .then((db) =>
      db.collection('audit_logs').insertOne({
        ts: new Date(),
        user_role: session?.role ?? 'Anonymous',
        user_id: session?.userId ?? null,
        action,
        entity,
        entity_id: entityId ?? null,
        ...(details ? { details } : {}),
      })
    )
    .catch((err) => console.warn('audit log skipped:', err.message));
}
