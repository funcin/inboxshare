import { Hono } from 'hono';
import { renderPage, resolveLocale, type Locale } from '../i18n';
import { LANDING_DICTS } from '../landing-i18n';
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

function render(env: Env, requestUrl: string, locale: Locale, path: string): string {
  const base = baseUrl(env, requestUrl);
  const dict = LANDING_DICTS[locale];
  return renderPage(landingPage, locale, {
    ...dict,
    baseUrl: base,
    canonical: `${base}${path}`,
    githubUrl: GITHUB_URL,
    deployUrl: DEPLOY_URL,
    switchLang: locale === 'en' ? 'zh-CN' : 'en',
  });
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
