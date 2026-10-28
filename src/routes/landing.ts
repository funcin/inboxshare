import { Hono } from 'hono';
import { addWaitlist } from '../db';
import { renderPage, resolveLocale, type Locale } from '../i18n';
import { isValidMailbox, normalizeMailbox } from '../util';
import { notifyWaitlist } from '../waitlist';
import { LANDING_DICTS, type LandingDict } from '../landing-i18n';
import landingPage from '../pages/landing.html';
import type { Env } from '../types';

type App = Hono<{ Bindings: Env }>;

export const GITHUB_URL = 'https://github.com/funcin/inboxshare';
const DEPLOY_URL = `https://deploy.workers.cloudflare.com/?url=${GITHUB_URL}`;

/** 首页允许被索引、可短缓存；index.ts 的中间件据此跳过 noindex / no-store */
export const LANDING_PATHS = new Set(['/', '/en', '/zh', '/robots.txt', '/sitemap.xml']);

function baseUrl(env: Env, requestUrl: string): string {
  const configured = env.PUBLIC_BASE_URL?.trim();
  return (configured || new URL(requestUrl).origin).replace(/\/+$/, '');
}

/** 结构化数据：软件条目（免费、开源、跑在 Cloudflare）+ FAQ，给搜索引擎富结果用 */
function jsonLd(dict: LandingDict, locale: Locale, url: string): string {
  const faq = ([1, 2, 3, 4, 5, 6, 7] as const).map((n) => ({
    '@type': 'Question',
    name: dict[`q${n}`],
    acceptedAnswer: { '@type': 'Answer', text: dict[`a${n}`] },
  }));
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: dict.brand,
        url,
        inLanguage: locale,
        description: dict.metaDesc,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Cloudflare Workers',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        license: `${GITHUB_URL}/blob/main/LICENSE`,
        sameAs: GITHUB_URL,
        keywords:
          'shared OTP inbox, email verification codes, Cloudflare Email Routing web UI, Cloudflare Email Worker, serverless shared inbox, read-only inbox, self-hosted',
      },
      { '@type': 'FAQPage', mainEntity: faq },
    ],
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function render(env: Env, requestUrl: string, locale: Locale, path: string): string {
  const base = baseUrl(env, requestUrl);
  const dict = LANDING_DICTS[locale];
  const canonical = `${base}${path}`;
  return renderPage(landingPage, locale, {
    ...dict,
    baseUrl: base,
    canonical,
    githubUrl: GITHUB_URL,
    deployUrl: DEPLOY_URL,
    guideUrl: `${GITHUB_URL}#deployment`,
    ogImage: `${base}/${locale === 'en' ? 'og-image.png' : 'og-image-zh.png'}`,
    switchLang: locale === 'en' ? 'zh-CN' : 'en',
  }).replace('@@JSONLD@@', jsonLd(dict, locale, canonical));
}

export function registerLandingRoutes(app: App): void {
  const cache = 'public, max-age=600';
  app.get('/', (c) => {
    c.header('Cache-Control', cache);
    return c.html(render(c.env, c.req.url, resolveLocale(c.env.LOCALE), '/'));
  });
  app.get('/en', (c) => {
    c.header('Cache-Control', cache);
    return c.html(render(c.env, c.req.url, 'en', '/en'));
  });
  app.get('/zh', (c) => {
    c.header('Cache-Control', cache);
    return c.html(render(c.env, c.req.url, 'zh-CN', '/zh'));
  });
  // 首页“想要托管版？”：只收邮箱。website 是蜜罐字段，机器人填了就假装成功
  app.post('/api/waitlist', async (c) => {
    let body: { email?: string; locale?: string; website?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_json' }, 400);
    }
    if (body.website) return c.json({ ok: true });
    const email = normalizeMailbox(body.email ?? '');
    if (!isValidMailbox(email)) return c.json({ error: 'invalid_email' }, 400);
    const locale = resolveLocale(body.locale);
    const now = Date.now();
    const isNew = await addWaitlist(c.env.DB, email, locale, now);
    if (isNew) c.executionCtx.waitUntil(notifyWaitlist(c.env, email, locale, now));
    return c.json({ ok: true });
  });

  app.get('/robots.txt', (c) => {
    c.header('Cache-Control', cache);
    return c.text(
      ['User-agent: *', 'Allow: /$', 'Allow: /en', 'Allow: /zh', 'Disallow: /s/', 'Disallow: /admin', 'Disallow: /api/', `Sitemap: ${baseUrl(c.env, c.req.url)}/sitemap.xml`, ''].join('\n'),
    );
  });
  app.get('/sitemap.xml', (c) => {
    const base = baseUrl(c.env, c.req.url);
    c.header('Cache-Control', cache);
    const urls = ['/', '/en', '/zh'].map((p) => `  <url><loc>${base}${p}</loc></url>`).join('\n');
    return c.body(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, 200, {
      'Content-Type': 'application/xml; charset=utf-8',
    });
  });
}
