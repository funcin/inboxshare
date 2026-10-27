import { Hono } from 'hono';
import { countHiddenSensitive, getLink, getMessage, listMessages } from '../db';
import { attachmentKey } from '../email';
import { DICTS, renderPage, resolveLocale } from '../i18n';
import { retentionDays } from '../cleanup';
import sharePage from '../pages/share.html';
import type { AttachmentMeta, Env, ShareLinkRow } from '../types';

type App = Hono<{ Bindings: Env }>;

/** 链接有效 → 返回该链接；否则 null。窗口起点按“现在”滚动计算 */
async function resolveLink(db: D1Database, key: string): Promise<ShareLinkRow | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(key)) return null;
  const link = await getLink(db, key);
  if (!link || link.status !== 'active') return null;
  if (link.expires_at !== null && link.expires_at <= Date.now()) return null;
  return link;
}

function windowStart(link: ShareLinkRow): number {
  return link.window_minutes > 0 ? Date.now() - link.window_minutes * 60_000 : 0;
}

function parseAttachments(json: string): AttachmentMeta[] {
  try {
    return JSON.parse(json) as AttachmentMeta[];
  } catch {
    return [];
  }
}

/** 浏览器可能直接渲染的类型一律按下载处理，避免把邮件附件当成同源页面打开 */
function safeContentType(mimeType: string): string {
  const t = mimeType.toLowerCase();
  if (t.startsWith('text/html') || t.includes('svg') || t.includes('xml') || t.includes('javascript')) {
    return 'application/octet-stream';
  }
  return mimeType;
}

export function registerPublicRoutes(app: App): void {
  app.get('/s/:key', (c) => {
    const selected = c.req.query('lang');
    const locale = selected === 'en' || selected === 'zh-CN' ? resolveLocale(selected) : resolveLocale(c.env.LOCALE);
    return c.html(renderPage(sharePage, locale, DICTS[locale], { days: String(retentionDays(c.env)) }));
  });

  app.get('/api/s/:key/messages', async (c) => {
    const link = await resolveLink(c.env.DB, c.req.param('key'));
    if (!link) return c.json({ error: 'denied' }, 403);

    const since = windowStart(link);
    const showSensitive = link.show_sensitive === 1;
    const [rows, hiddenSensitive] = await Promise.all([
      listMessages(c.env.DB, link.mailbox, since, showSensitive),
      showSensitive ? Promise.resolve(0) : countHiddenSensitive(c.env.DB, link.mailbox, since),
    ]);
    return c.json({
      mailbox: link.mailbox,
      label: link.label,
      windowMinutes: link.window_minutes,
      expiresAt: link.expires_at,
      hiddenSensitive,
      items: rows.map((r) => ({
        id: r.id,
        from: { address: r.from_address, name: r.from_name },
        subject: r.subject,
        receivedAt: r.received_at,
        snippet: r.snippet,
        code: r.code,
        category: r.category,
        attachmentCount: parseAttachments(r.attachments_json).length,
      })),
    });
  });

  app.get('/api/s/:key/messages/:id', async (c) => {
    const key = c.req.param('key');
    const link = await resolveLink(c.env.DB, key);
    if (!link) return c.json({ error: 'denied' }, 403);

    const msg = await getMessage(c.env.DB, c.req.param('id'), link.mailbox, windowStart(link), link.show_sensitive === 1);
    if (!msg) return c.json({ error: 'not_found' }, 404);

    let html = msg.html_body;
    if (!html && msg.html_r2_key) {
      const obj = await c.env.ATTACHMENTS.get(msg.html_r2_key);
      html = obj ? await obj.text() : null;
    }
    const attachments = parseAttachments(msg.attachments_json).map((a) => ({
      ...a,
      url: `/api/s/${encodeURIComponent(key)}/messages/${encodeURIComponent(msg.id)}/attachments/${a.n}`,
    }));
    return c.json({
      id: msg.id,
      mailbox: msg.mailbox,
      from: { address: msg.from_address, name: msg.from_name },
      subject: msg.subject,
      receivedAt: msg.received_at,
      code: msg.code,
      category: msg.category,
      html,
      text: msg.text_body,
      attachments,
    });
  });

  app.get('/api/s/:key/messages/:id/attachments/:n', async (c) => {
    const link = await resolveLink(c.env.DB, c.req.param('key'));
    if (!link) return c.json({ error: 'denied' }, 403);

    const msg = await getMessage(c.env.DB, c.req.param('id'), link.mailbox, windowStart(link), link.show_sensitive === 1);
    if (!msg) return c.json({ error: 'not_found' }, 404);

    const n = Number(c.req.param('n'));
    const meta = parseAttachments(msg.attachments_json).find((a) => a.n === n);
    if (!meta) return c.json({ error: 'not_found' }, 404);

    const obj = await c.env.ATTACHMENTS.get(attachmentKey(msg.id, n));
    if (!obj) return c.json({ error: 'not_found' }, 404);

    const filename = encodeURIComponent(meta.filename).replace(/['()]/g, escape);
    return new Response(obj.body, {
      headers: {
        'Content-Type': safeContentType(meta.mimeType),
        'Content-Length': String(obj.size),
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  });
}
