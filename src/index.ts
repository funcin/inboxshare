import { Hono } from 'hono';
import { csp } from './analytics';
import { runCleanup } from './cleanup';
import { handleEmail } from './email';
import { registerAdminRoutes } from './routes/admin';
import { LANDING_PATHS, registerLandingRoutes } from './routes/landing';
import { registerPublicRoutes } from './routes/public';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// 除首页外都是私密内容：禁止索引、不带 referrer、不缓存
app.use('*', async (c, next) => {
  await next();
  const isLanding = LANDING_PATHS.has(c.req.path);
  if (!isLanding) c.header('X-Robots-Tag', 'noindex, nofollow');
  c.header('Referrer-Policy', isLanding ? 'strict-origin-when-cross-origin' : 'no-referrer');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  if (!c.res.headers.has('Cache-Control')) c.header('Cache-Control', 'no-store');
  // 自家页面一律严格 CSP（src/analytics.ts）；首页在 landing.ts 里自己设（配了统计时多放行 Plausible 的域）
  if (c.res.headers.get('content-type')?.includes('text/html') && !c.res.headers.has('Content-Security-Policy')) {
    c.header('Content-Security-Policy', csp());
  }
});

registerLandingRoutes(app);
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
