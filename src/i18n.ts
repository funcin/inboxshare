/**
 * 分享页文案字典。语言是部署时的选项：wrangler.jsonc 的 vars.LOCALE = "zh-CN" | "en"。
 * 静态文案在服务端替换 {{key}}；动态文案（时间、计数）把整本字典注入页面脚本。
 */

export type Locale = 'zh-CN' | 'en';

export function resolveLocale(value: string | undefined): Locale {
  return value?.trim().toLowerCase().startsWith('en') ? 'en' : 'zh-CN';
}

const zhCN = {
  title: '共享收件箱',
  copyAddress: '复制地址',
  copy: '复制',
  copied: '已复制',
  refresh: '刷新',
  inbox: '收件箱',
  countFmt: '{n} 封',
  autoRefresh: '每 30 秒自动刷新',
  loading: '正在加载邮件…',
  loadFailed: '加载失败，请刷新',
  empty: '当前时间范围内没有邮件',
  denied: '无权访问：链接不存在、已撤销或已过期。',
  pick: '选择一封邮件查看内容',
  loadingMsg: '正在加载邮件内容…',
  gone: '邮件已超出可见范围或不存在',
  back: '返回列表',
  codeDetected: '检测到验证码',
  copyCode: '复制验证码',
  codeCopied: '已复制验证码',
  receivedAgo: '收到于 {t}',
  to: '收件人',
  attachments: '附件',
  footer: '只读分享页：不能回复、转发或删除。链接由所有者随时撤销，邮件 {days} 天后自动清理。',
  noSubject: '（无主题）',
  unknownSender: '未知发件人',
  emptyBody: '（空正文）',
  windowAll: '全部邮件',
  windowMin: '最近 {n} 分钟',
  windowHour: '最近 {n} 小时',
  windowDay: '最近 {n} 天',
  justNow: '刚刚',
  minAgo: '{n} 分钟前',
  yesterday: '昨天',
};

const en: typeof zhCN = {
  title: 'Shared Inbox',
  copyAddress: 'Copy address',
  copy: 'Copy',
  copied: 'Copied',
  refresh: 'Refresh',
  inbox: 'Inbox',
  countFmt: '{n} messages',
  autoRefresh: 'refreshes every 30 s',
  loading: 'Loading messages…',
  loadFailed: "Couldn't load messages, please refresh",
  empty: 'No messages in this time window',
  denied: "This link doesn't exist, was revoked or has expired.",
  pick: 'Select a message to read it',
  loadingMsg: 'Loading message…',
  gone: 'This message is outside the visible window or no longer exists',
  back: 'Back to inbox',
  codeDetected: 'Verification code detected',
  copyCode: 'Copy code',
  codeCopied: 'Code copied',
  receivedAgo: 'received {t}',
  to: 'To',
  attachments: 'Attachments',
  footer: "Read-only share: you can't reply, forward or delete. The owner can revoke this link at any time; messages are deleted after {days} days.",
  noSubject: '(no subject)',
  unknownSender: 'Unknown sender',
  emptyBody: '(empty message)',
  windowAll: 'All messages',
  windowMin: 'Last {n} min',
  windowHour: 'Last {n} hours',
  windowDay: 'Last {n} days',
  justNow: 'just now',
  minAgo: '{n} min ago',
  yesterday: 'Yesterday',
};

export type Dict = typeof zhCN;

export const DICTS: Record<Locale, Dict> = { 'zh-CN': zhCN, en };

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** 把页面模板里的 {{key}} 换成当前语言文案，并把 @@LOCALE@@ / @@I18N_JSON@@ 换成语言与字典 JSON */
export function renderPage(template: string, locale: Locale, vars: Record<string, string> = {}): string {
  const dict = DICTS[locale];
  const json = JSON.stringify(dict).replace(/</g, '\\u003c');
  return template
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      const raw = (dict as Record<string, string>)[key] ?? key;
      const filled = raw.replace(/\{(\w+)\}/g, (__, v: string) => vars[v] ?? `{${v}}`);
      return escapeHtml(filled);
    })
    .replace(/@@LOCALE@@/g, locale)
    .replace('@@I18N_JSON@@', json);
}
