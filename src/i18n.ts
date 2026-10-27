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

const adminZhCN = {
  adminTitle: '共享收件箱 · 管理',
  tokenLabel: '管理令牌（ADMIN_TOKEN，仅存于本标签页）',
  enter: '进入',
  authErr: '令牌错误或管理接口未启用',
  newLink: '新建分享链接',
  mailbox: '邮箱地址',
  mailboxPlaceholder: 'share@yourdomain.com',
  window: '时间窗口',
  win30: '最近 30 分钟',
  win60: '最近 1 小时',
  win360: '最近 6 小时',
  win1440: '最近 1 天',
  win10080: '最近 7 天',
  win0: '不限（受保留期约束）',
  expires: '链接过期时间（可选）',
  label: '备注（可选）',
  labelPlaceholder: '例如：Disney 家庭组',
  create: '生成链接',
  createFailed: '创建失败：{reason}',
  created: '已生成：',
  mailboxes: '已收到邮件的邮箱',
  thMailbox: '邮箱',
  thCount: '邮件数',
  thLatest: '最近一封',
  mbEmpty: '还没有收到任何邮件。先在 Cloudflare Email Routing 里把地址指向这个 Worker。',
  links: '分享链接',
  thLink: '链接',
  thWindow: '窗口',
  thStatus: '状态',
  thExpires: '过期',
  linkEmpty: '暂无链接',
  revoke: '撤销',
  copy: '复制',
  copied: '已复制',
  confirmRevoke: '撤销后该链接立即失效，确定？',
  statusActive: '有效',
  statusRevoked: '已撤销',
  statusExpired: '已过期',
  winAll: '不限',
  winMin: '{n} 分钟',
  winHour: '{n} 小时',
  winDay: '{n} 天',
  errInvalidMailbox: '邮箱地址格式不对',
  errInvalidWindow: '时间窗口不在允许范围内',
  errInvalidExpires: '过期时间格式不对',
  errExpiresPast: '过期时间必须在未来',
};

const adminEn: typeof adminZhCN = {
  adminTitle: 'Shared Inbox · Admin',
  tokenLabel: 'Admin token (ADMIN_TOKEN, kept only in this tab)',
  enter: 'Sign in',
  authErr: 'Wrong token, or the admin API is disabled',
  newLink: 'New share link',
  mailbox: 'Mailbox',
  mailboxPlaceholder: 'share@yourdomain.com',
  window: 'Time window',
  win30: 'Last 30 minutes',
  win60: 'Last hour',
  win360: 'Last 6 hours',
  win1440: 'Last 24 hours',
  win10080: 'Last 7 days',
  win0: 'All (within retention)',
  expires: 'Link expiry (optional)',
  label: 'Label (optional)',
  labelPlaceholder: 'e.g. Disney family',
  create: 'Create link',
  createFailed: "Couldn't create the link: {reason}",
  created: 'Created: ',
  mailboxes: 'Mailboxes with messages',
  thMailbox: 'Mailbox',
  thCount: 'Messages',
  thLatest: 'Latest',
  mbEmpty: 'No messages yet. Point an address at this Worker in Cloudflare Email Routing first.',
  links: 'Share links',
  thLink: 'Link',
  thWindow: 'Window',
  thStatus: 'Status',
  thExpires: 'Expires',
  linkEmpty: 'No links yet',
  revoke: 'Revoke',
  copy: 'Copy',
  copied: 'Copied',
  confirmRevoke: 'Revoking makes this link stop working immediately. Continue?',
  statusActive: 'Active',
  statusRevoked: 'Revoked',
  statusExpired: 'Expired',
  winAll: 'All',
  winMin: '{n} min',
  winHour: '{n} h',
  winDay: '{n} d',
  errInvalidMailbox: 'That mailbox address is not valid',
  errInvalidWindow: 'That time window is not allowed',
  errInvalidExpires: 'That expiry date is not valid',
  errExpiresPast: 'The expiry must be in the future',
};

export type AdminDict = typeof adminZhCN;

export const ADMIN_DICTS: Record<Locale, AdminDict> = { 'zh-CN': adminZhCN, en: adminEn };

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** 把页面模板里的 {{key}} 换成当前语言文案，并把 @@LOCALE@@ / @@I18N_JSON@@ 换成语言与字典 JSON */
export function renderPage(
  template: string,
  locale: Locale,
  dict: Record<string, string>,
  vars: Record<string, string> = {},
): string {
  const json = JSON.stringify(dict).replace(/</g, '\\u003c');
  return template
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      const raw = dict[key] ?? key;
      const filled = raw.replace(/\{(\w+)\}/g, (__, v: string) => vars[v] ?? `{${v}}`);
      return escapeHtml(filled);
    })
    .replace(/@@LOCALE@@/g, locale)
    .replace('@@I18N_JSON@@', json);
}
