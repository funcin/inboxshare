/**
 * 从邮件里识别“点击才能拿到验证码 / 确认是我本人”这类操作链接。
 *
 * Netflix 的暂时存取码不直接写在邮件里，而是一个「取得存取碼 / Get Code」按钮，点开才显示；
 * Disney+ / HBO Max 的「Yes, this was me」也是按钮。只读分享页如果只能“看”，访客就得手动去正文里找按钮。
 *
 * 规则：
 *   1. 优先看 HTML 里的 <a>：锚文本（含图片 alt）命中“取码 / 验证 / 是我本人”类强关键词的链接直接入选；
 *      “登录 / 确认 / 继续”这类弱关键词只在主题本身像验证码邮件时才算数。
 *   2. 没有 HTML 或 HTML 里找不到时，退回纯文本：取关键词附近的 URL。
 *   3. 退订、帮助中心、隐私条款、登出、改密码等链接一律排除。
 * 只接受 http(s) 链接，长度上限 2048。
 */

// 带 .ts 后缀：scripts/test-classify.mts 用 node --experimental-strip-types 直接跑，不经打包器
import { KEYWORD as CODE_KEYWORD } from './code.ts';

/** 强关键词：锚文本有这些就是操作按钮 */
const STRONG =
  /取得存取[碼码]|获取存取[碼码]|存取[碼码]|(取得|获取|獲取|查看|檢視|显示|顯示)(驗證碼|验证码|代[碼码]|[驗验]證[碼码])|(get|view|show|reveal|see)\s+(your\s+|the\s+|my\s+)?(access\s+|verification\s+|login\s+|sign[- ]?in\s+|one[- ]time\s+)?code\b|access\s+code|verify\b|verification|驗證|验证|(yes,?\s+)?(this|it)\s+was\s+me|是我本人|是本人|magic\s+link|activate\b|激活|啟用|启用/i;

/** 弱关键词：只在主题像验证码 / 登录链接邮件时才算操作按钮（Anthropic Console 的魔法链接按钮就只写 “Sign in”） */
const WEAK = /sign\s*in|log\s*in|login|continue|confirm|確認|确认|登录|登入|繼續|继续/i;

/** 主题像“登录链接”邮件：secure link / magic link / sign in to … / 登录链接 */
const SUBJECT_LINK = /secure link|magic link|sign[- ]?in|log[- ]?in|login|登录|登入|链接|連結|confirm|確認|确认/i;

/** 排除（按锚文本）：页脚和安全提示里的链接，不是“拿码”的按钮 */
const EXCLUDE =
  /unsubscribe|退订|取消订阅|取消訂閱|preference|privacy|隐私|隱私|terms|条款|條款|help|support|帮助|幫助|說明|说明|faq|contact|联系|聯繫|sign\s*out|log\s*out|登出|退出|password|密[码碼]|forgot|reset|重置|device|裝置|设备|設備|app\s*store|google\s*play|download|下载|下載|facebook|twitter|instagram|youtube|tiktok|unrecogni/i;

/** 排除（按 URL 路径，不看 query）：退订、偏好、隐私条款、帮助中心 */
const EXCLUDE_PATH = /unsubscribe|opt[-_]?out|preference|privacy|\/terms|\/legal|\/help\b|\/support\b|\/faq|\/contact/i;
/** 排除（按域名）：帮助/支持子域、应用商店、社交账号（注意不能用 x\.com 子串匹配，会误伤 netflix.com） */
const EXCLUDE_HOST = /^(help|support)\.|^apps\.apple\.com$|^play\.google\.com$|(^|\.)(facebook|twitter|x|instagram|youtube|tiktok|linkedin)\.com$/i;

const MAX_HTML = 400 * 1024;
const MAX_TEXT = 20 * 1024;
const MAX_URL = 2048;

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ');
}

/** 锚文本：图片按钮用 alt / title 顶上，其余去标签、压空白 */
function anchorText(inner: string, attrs: string): string {
  const alts: string[] = [];
  inner.replace(/<img\b[^>]*?\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (_, a: string, b: string) => {
    alts.push(a ?? b ?? '');
    return '';
  });
  const title = /\b(?:title|aria-label)\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
  const text = inner.replace(/<[^>]+>/g, ' ');
  return decodeEntities([text, ...alts, title?.[1] ?? title?.[2] ?? ''].join(' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function acceptableUrl(raw: string): string | null {
  const url = decodeEntities(raw).trim();
  if (!/^https?:\/\//i.test(url) || url.length > MAX_URL) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (EXCLUDE_HOST.test(parsed.hostname) || EXCLUDE_PATH.test(parsed.pathname)) return null;
  return url;
}

function scoreText(label: string, subjectLooksLikeCode: boolean): number {
  if (!label || EXCLUDE.test(label)) return 0;
  if (STRONG.test(label)) return 10;
  if (subjectLooksLikeCode && WEAK.test(label)) return 4;
  return 0;
}

function fromHtml(html: string, subjectLooksLikeCode: boolean): string | null {
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let best: { url: string; score: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const attrs = m[1] ?? '';
    const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const url = acceptableUrl(href?.[1] ?? href?.[2] ?? href?.[3] ?? '');
    if (!url) continue;
    const score = scoreText(anchorText(m[2] ?? '', attrs), subjectLooksLikeCode);
    // 同分取先出现的：邮件里的主按钮总在页脚链接前面
    if (score > 0 && (!best || score > best.score)) best = { url, score };
  }
  return best?.url ?? null;
}

function fromText(text: string, subjectLooksLikeCode: boolean): string | null {
  const re = /https?:\/\/[^\s<>"'）)\]]+/g;
  let best: { url: string; score: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const url = acceptableUrl(m[0].replace(/[.,;:!?。，；：]+$/, ''));
    if (!url) continue;
    // 纯文本里按钮文字通常紧挨在 URL 前面（上一行或同一行）。逐行打分而不是整段：
    // 更早的段落可能带“裝置 / 密碼”等排除词，不能连坐
    const before = text.slice(Math.max(0, m.index - 200), m.index).split('\n').map((l) => l.trim()).filter(Boolean).slice(-2);
    const after = (text.slice(m.index + m[0].length, m.index + m[0].length + 80).split('\n')[0] ?? '').trim();
    const score = Math.max(...[...before, after].map((l) => scoreText(l, subjectLooksLikeCode)), 0);
    if (score > 0 && (!best || score > best.score)) best = { url, score };
  }
  return best?.url ?? null;
}

export function detectActionLink(subject: string | null, text: string | null, html: string | null): string | null {
  const subj = subject ?? '';
  const subjectLooksLikeCode = CODE_KEYWORD.test(subj) || SUBJECT_LINK.test(subj);
  if (html) {
    const hit = fromHtml(html.slice(0, MAX_HTML), subjectLooksLikeCode);
    if (hit) return hit;
  }
  if (text) return fromText(text.slice(0, MAX_TEXT), subjectLooksLikeCode);
  return null;
}
