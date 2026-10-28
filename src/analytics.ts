import type { Env } from './types';

// 首页统计：站长自托管的 Plausible（data.funcin.de，无 Cookie、不存标识，与 seenwell / alcyontech 同一实例）。
// 只有首页（/、/en、/zh）打标：统计脚本会上报整条 URL，而 /s/<key> 的 URL 本身就是访问凭证，/admin 也不该外泄，
// 这两类页面继续用 index.ts 的严格 CSP、不加载任何第三方资源。
// 站点名来自 wrangler.jsonc 的 ANALYTICS_DOMAIN；留空（顶层模板、本地开发）= 不打标、首页也用严格 CSP。
// 脚本带 outbound-links 扩展：首页的转化就是点去 GitHub / Deploy 的外链。

const PLAUSIBLE = 'https://data.funcin.de';
const PLAUSIBLE_SCRIPT = `${PLAUSIBLE}/js/script.outbound-links.js`;

/** 严格 CSP 之上某个页面额外放行的来源 */
export type CspExtra = { script?: string[]; connect?: string[] };

/** 自家页面的 CSP：只跑自己的内联脚本，邮件正文在 sandbox iframe + 更严的 srcdoc CSP 里渲染；extra 是首页统计脚本要的来源 */
export function csp(extra: CspExtra = {}): string {
  const list = (sources?: string[]) => (sources?.length ? ` ${sources.join(' ')}` : '');
  return `default-src 'none'; script-src 'unsafe-inline'${list(extra.script)}; style-src 'unsafe-inline'; img-src 'self' data:; font-src data:; connect-src 'self'${list(extra.connect)}; frame-src 'self' about:; base-uri 'none'; form-action 'none'`;
}

/** 首页 <head> 里的统计标签和它需要的 CSP；没配 ANALYTICS_DOMAIN 时是空标签 + 严格 CSP */
export function analytics(env: Env): { head: string; csp: string } {
  const domain = env.ANALYTICS_DOMAIN?.trim();
  if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) return { head: '', csp: csp() };
  return {
    head: `<script defer data-domain="${domain}" src="${PLAUSIBLE_SCRIPT}"></script>`,
    csp: csp({ script: [PLAUSIBLE], connect: [PLAUSIBLE] }),
  };
}
