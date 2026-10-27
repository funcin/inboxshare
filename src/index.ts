import { Hono } from 'hono';
import { runCleanup } from './cleanup';
import { handleEmail } from './email';
import { registerAdminRoutes } from './routes/admin';
import { registerPublicRoutes } from './routes/public';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// 全站都是私密内容：禁止索引、不带 referrer、不缓存
app.use('*', async (c, next) => {
  await next();
  c.header('X-Robots-Tag', 'noindex, nofollow');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  if (!c.res.headers.has('Cache-Control')) c.header('Cache-Control', 'no-store');
  if (c.res.headers.get('content-type')?.includes('text/html')) {
    // 自家页面：只跑自己的内联脚本；邮件正文在 sandbox iframe + 更严的 srcdoc CSP 里渲染
    c.header(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; font-src data:; connect-src 'self'; frame-src 'self' about:; base-uri 'none'; form-action 'none'",
    );
  }
});

app.get('/', (c) => c.text('shared-inbox: use /s/<key> or /admin', 200));
app.get('/robots.txt', (c) => c.text('User-agent: *\nDisallow: /\n'));

registerPublicRoutes(app);
registerAdminRoutes(app);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal' }, 500);
});

export default {
  fetch: app.fetch,
  email: handleEmail,
  scheduled(_event, env, ctx) {
    ctx.waitUntil(
      runCleanup(env).then((r) => console.log('cleanup done', r)),
    );
  },
} satisfies ExportedHandler<Env>;
