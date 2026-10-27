import PostalMime from 'postal-mime';
import { insertMessage } from './db';
import type { AttachmentMeta, Env } from './types';
import { newMessageId, normalizeMailbox } from './util';

/** 正文超过这个大小就落 R2，避免撞 D1 单值上限 */
const MAX_INLINE_BODY = 700 * 1024;
const MAX_TEXT_BODY = 200 * 1024;

export function attachmentKey(messageId: string, n: number): string {
  return `att/${messageId}/${n}`;
}

export function bodyKey(messageId: string): string {
  return `body/${messageId}.html`;
}

/**
 * Email Routing 把邮件投到这里：解析 MIME → 附件进 R2 → 元数据和正文进 D1。
 * 抛错会让 Cloudflare 向发件人退信，所以只在确实存不下时抛。
 */
export async function handleEmail(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
  const raw = await new Response(message.raw).arrayBuffer();
  const parsed = await PostalMime.parse(raw);
  const id = newMessageId();
  const mailbox = normalizeMailbox(message.to);
  const receivedAt = Date.now();

  const metas: AttachmentMeta[] = [];
  const attachments = parsed.attachments ?? [];
  for (let n = 0; n < attachments.length; n++) {
    const a = attachments[n];
    const content = typeof a.content === 'string' ? new TextEncoder().encode(a.content) : a.content;
    const mimeType = a.mimeType || 'application/octet-stream';
    const filename = a.filename || `attachment-${n + 1}`;
    await env.ATTACHMENTS.put(attachmentKey(id, n), content, {
      httpMetadata: { contentType: mimeType },
      customMetadata: { filename, messageId: id },
    });
    metas.push({
      n,
      filename,
      mimeType,
      size: content.byteLength,
      inline: a.disposition === 'inline',
      contentId: a.contentId ?? null,
    });
  }

  let html: string | null = parsed.html ?? null;
  let htmlR2Key: string | null = null;
  if (html && html.length > MAX_INLINE_BODY) {
    htmlR2Key = bodyKey(id);
    await env.ATTACHMENTS.put(htmlR2Key, html, {
      httpMetadata: { contentType: 'text/html; charset=utf-8' },
    });
    html = null;
  }
  const text = parsed.text ? parsed.text.slice(0, MAX_TEXT_BODY) : null;

  await insertMessage(env.DB, {
    id,
    mailbox,
    from_address: parsed.from?.address ?? message.from ?? null,
    from_name: parsed.from?.name || null,
    subject: parsed.subject ?? null,
    received_at: receivedAt,
    text_body: text,
    html_body: html,
    html_r2_key: htmlR2Key,
    size: raw.byteLength,
    attachments_json: JSON.stringify(metas),
  });

  // 可选：同时转发一份到真实邮箱（目标必须在 Email Routing 里验证过）
  const forwardTo = env.FORWARD_TO?.trim();
  if (forwardTo) {
    ctx.waitUntil(
      message.forward(forwardTo).catch((err: unknown) => {
        console.error('forward failed', forwardTo, err);
      }),
    );
  }
}
