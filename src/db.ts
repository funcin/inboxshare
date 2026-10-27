import type { MessageListRow, MessageRow, ShareLinkRow } from './types';

export async function insertMessage(db: D1Database, row: MessageRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO messages (id, mailbox, from_address, from_name, subject, received_at,
         text_body, html_body, html_r2_key, size, attachments_json, code, category)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    )
    .bind(
      row.id,
      row.mailbox,
      row.from_address,
      row.from_name,
      row.subject,
      row.received_at,
      row.text_body,
      row.html_body,
      row.html_r2_key,
      row.size,
      row.attachments_json,
      row.code,
      row.category,
    )
    .run();
}

/** 敏感类在 SQL 里的过滤条件：showSensitive=1 时放行全部 */
const SENSITIVE_FILTER = `(?4 = 1 OR category NOT IN ('reset', 'billing', 'security'))`;

export async function listMessages(
  db: D1Database,
  mailbox: string,
  sinceMs: number,
  showSensitive: boolean,
  limit = 100,
): Promise<MessageListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, from_address, from_name, subject, received_at,
              substr(text_body, 1, 200) AS snippet, attachments_json, code, category
       FROM messages
       WHERE mailbox = ?1 AND received_at >= ?2 AND ${SENSITIVE_FILTER}
       ORDER BY received_at DESC
       LIMIT ?3`,
    )
    .bind(mailbox, sinceMs, limit, showSensitive ? 1 : 0)
    .all<MessageListRow>();
  return results;
}

/** 当前窗口内被隐藏的敏感邮件数量，分享页用来提示“还有 N 封未显示” */
export async function countHiddenSensitive(db: D1Database, mailbox: string, sinceMs: number): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM messages
       WHERE mailbox = ?1 AND received_at >= ?2 AND category IN ('reset', 'billing', 'security')`,
    )
    .bind(mailbox, sinceMs)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getMessage(
  db: D1Database,
  id: string,
  mailbox: string,
  sinceMs: number,
  showSensitive: boolean,
): Promise<MessageRow | null> {
  return db
    .prepare(`SELECT * FROM messages WHERE id = ?1 AND mailbox = ?2 AND received_at >= ?3 AND ${SENSITIVE_FILTER}`)
    .bind(id, mailbox, sinceMs, showSensitive ? 1 : 0)
    .first<MessageRow>();
}

export async function getLink(db: D1Database, key: string): Promise<ShareLinkRow | null> {
  return db.prepare(`SELECT * FROM share_links WHERE key = ?1`).bind(key).first<ShareLinkRow>();
}

export async function listLinks(db: D1Database): Promise<ShareLinkRow[]> {
  const { results } = await db
    .prepare(`SELECT * FROM share_links ORDER BY created_at DESC LIMIT 500`)
    .all<ShareLinkRow>();
  return results;
}

export async function createLink(db: D1Database, link: ShareLinkRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO share_links (key, mailbox, label, window_minutes, expires_at, status, created_at, revoked_at, show_sensitive)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8)`,
    )
    .bind(
      link.key,
      link.mailbox,
      link.label,
      link.window_minutes,
      link.expires_at,
      link.status,
      link.created_at,
      link.show_sensitive,
    )
    .run();
}

export async function revokeLink(db: D1Database, key: string, now: number): Promise<boolean> {
  const res = await db
    .prepare(`UPDATE share_links SET status = 'revoked', revoked_at = ?2 WHERE key = ?1 AND status = 'active'`)
    .bind(key, now)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function listMailboxes(
  db: D1Database,
): Promise<Array<{ mailbox: string; count: number; latest: number }>> {
  const { results } = await db
    .prepare(
      `SELECT mailbox, COUNT(*) AS count, MAX(received_at) AS latest
       FROM messages GROUP BY mailbox ORDER BY latest DESC`,
    )
    .all<{ mailbox: string; count: number; latest: number }>();
  return results;
}

export interface PurgeCandidate {
  id: string;
  html_r2_key: string | null;
  attachments_json: string;
}

export async function findMessagesBefore(
  db: D1Database,
  cutoffMs: number,
  limit = 200,
): Promise<PurgeCandidate[]> {
  const { results } = await db
    .prepare(`SELECT id, html_r2_key, attachments_json FROM messages WHERE received_at < ?1 LIMIT ?2`)
    .bind(cutoffMs, limit)
    .all<PurgeCandidate>();
  return results;
}

export async function deleteMessages(db: D1Database, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `?${i + 1}`).join(',');
  await db.prepare(`DELETE FROM messages WHERE id IN (${placeholders})`).bind(...ids).run();
}

export async function expireLinks(db: D1Database, now: number): Promise<void> {
  await db
    .prepare(`UPDATE share_links SET status = 'expired' WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= ?1`)
    .bind(now)
    .run();
}
