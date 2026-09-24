import { db } from '../db.js';
import { Activity } from '../../shared/types.js';
import { v4 as uuidv4 } from 'uuid';

export function logActivity(
  type: Activity['type'],
  actor: string,
  description: string,
  metadata?: Record<string, any>
): Activity {
  const id = `ACT-${uuidv4().slice(0, 8)}`;
  const timestamp = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO activity (id, timestamp, type, actor, description, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, timestamp, type, actor, description, metadata ? JSON.stringify(metadata) : null);

  return {
    id,
    timestamp,
    type,
    actor,
    description,
    metadata
  };
}

export function getRecentActivities(limit = 50): Activity[] {
  const rows = db.prepare(`SELECT * FROM activity ORDER BY timestamp DESC LIMIT ?`).all(limit) as any[];
  return rows.map(r => ({
    ...r,
    metadata: r.metadata ? JSON.parse(r.metadata) : undefined
  }));
}
