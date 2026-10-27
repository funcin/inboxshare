import { deleteMessages, expireLinks, findMessagesBefore } from './db';
import { attachmentKey } from './email';
import type { AttachmentMeta, Env } from './types';

const DEFAULT_RETENTION_DAYS = 30;

export function retentionDays(env: Env): number {
  const n = Number(env.RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION_DAYS;
}

/** 定时任务：删过期邮件（含 R2 附件/正文），并把到期链接标为 expired */
export async function runCleanup(env: Env): Promise<{ deleted: number }> {
  const now = Date.now();
  await expireLinks(env.DB, now);

  const cutoff = now - retentionDays(env) * 86_400_000;
  let deleted = 0;
  for (let round = 0; round < 50; round++) {
    const batch = await findMessagesBefore(env.DB, cutoff);
    if (batch.length === 0) break;

    const keys: string[] = [];
    for (const m of batch) {
      if (m.html_r2_key) keys.push(m.html_r2_key);
      let metas: AttachmentMeta[] = [];
      try {
        metas = JSON.parse(m.attachments_json) as AttachmentMeta[];
      } catch {
        metas = [];
      }
      for (const a of metas) keys.push(attachmentKey(m.id, a.n));
    }
    if (keys.length > 0) await env.ATTACHMENTS.delete(keys);
    await deleteMessages(
      env.DB,
      batch.map((m) => m.id),
    );
    deleted += batch.length;
  }
  return { deleted };
}
