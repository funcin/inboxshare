import { Hono } from 'hono';
import { countLinks, createLink, deleteLink, listLinks, listMailboxes, revokeLink } from '../db';
import { ADMIN_DICTS, renderPage, resolveLocale } from '../i18n';
import adminPage from '../pages/admin.html';
import { WINDOW_OPTIONS, type Env, type ShareLinkRow } from '../types';
import { buildShareKey, isValidMailbox, normalizeMailbox, safeEqual } from '../util';

type App = Hono<{ Bindings: Env }>;

interface CreateLinkBody {
  mailbox?: string;
  label?: string;
  windowMinutes?: number;
  expiresAt?: string | null;
  /** 是否也显示密码重置/账单/账户安全类邮件；默认 false */
  showSensitive?: boolean;
}

function publicBase(env: Env, requestUrl: string): string {
  const configured = env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return new URL(requestUrl).origin;
}

function withUrl(link: ShareLinkRow, base: string) {
  return { ...link, url: `${base}/s/${link.key}` };
}

export function registerAdminRoutes(app: App): void {
  app.get('/admin', (c) => {
    const selected = c.req.query('lang');
    const locale = selected === 'en' || selected === 'zh-CN' ? resolveLocale(selected) : resolveLocale(c.env.LOCALE);
    return c.html(renderPage(adminPage, locale, ADMIN_DICTS[locale]));
  });

  // 所有 /api/admin/* 都要 Bearer ADMIN_TOKEN；未配置 token 时整个管理接口关闭
  app.use('/api/admin/*', async (c, next) => {
    const expected = c.env.ADMIN_TOKEN?.trim();
    if (!expected || expected.length < 16) {
      return c.json({ error: 'admin_disabled', hint: 'set ADMIN_TOKEN secret (>=16 chars)' }, 503);
    }
    const header = c.req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token || !safeEqual(token, expected)) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    await next();
  });

  app.get('/api/admin/session', (c) => c.json({ ok: true }));

  app.get('/api/admin/mailboxes', async (c) => {
    return c.json({ items: await listMailboxes(c.env.DB) });
  });

  app.get('/api/admin/links', async (c) => {
    const base = publicBase(c.env, c.req.url);
    const links = await listLinks(c.env.DB);
    return c.json({ items: links.map((l) => withUrl(l, base)) });
  });

  app.post('/api/admin/links', async (c) => {
    let body: CreateLinkBody;
    try {
      body = await c.req.json<CreateLinkBody>();
    } catch {
      return c.json({ error: 'invalid_json' }, 400);
    }

    const mailbox = normalizeMailbox(body.mailbox ?? '');
    if (!isValidMailbox(mailbox)) return c.json({ error: 'invalid_mailbox' }, 400);

    const windowMinutes = Number(body.windowMinutes ?? 30);
    if (!(WINDOW_OPTIONS as readonly number[]).includes(windowMinutes)) {
      return c.json({ error: 'invalid_window', allowed: WINDOW_OPTIONS }, 400);
    }

    let expiresAt: number | null = null;
    if (body.expiresAt) {
      const t = Date.parse(body.expiresAt);
      if (!Number.isFinite(t)) return c.json({ error: 'invalid_expires_at' }, 400);
      if (t <= Date.now()) return c.json({ error: 'expires_in_past' }, 400);
      expiresAt = t;
    }

    const label = (body.label ?? '').trim().slice(0, 100) || null;
    const link: ShareLinkRow = {
      key: buildShareKey(mailbox, label, await countLinks(c.env.DB, mailbox)),
      mailbox,
      label,
      window_minutes: windowMinutes,
      expires_at: expiresAt,
      status: 'active',
      created_at: Date.now(),
      revoked_at: null,
      show_sensitive: body.showSensitive === true ? 1 : 0,
    };
    await createLink(c.env.DB, link);
    return c.json({ link: withUrl(link, publicBase(c.env, c.req.url)) }, 201);
  });

  // 撤销：记录保留、状态改 revoked，链接立即失效
  app.post('/api/admin/links/:key/revoke', async (c) => {
    const ok = await revokeLink(c.env.DB, c.req.param('key'), Date.now());
    if (!ok) return c.json({ error: 'not_found_or_not_active' }, 404);
    return c.json({ ok: true });
  });

  // 删除：记录从 D1 移除，链接立即失效，管理页不再显示；邮件本身不受影响
  app.delete('/api/admin/links/:key', async (c) => {
    const ok = await deleteLink(c.env.DB, c.req.param('key'));
    if (!ok) return c.json({ error: 'not_found' }, 404);
    return c.json({ ok: true });
  });
}
