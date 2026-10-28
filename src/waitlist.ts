import { EmailMessage } from 'cloudflare:email';
import type { Env } from './types';

/**
 * 首页“想要托管版？”名单的通知：给站长自己的邮箱发一封纯文本邮件。
 * 只在 EMAIL 绑定 + WAITLIST_TO + WAITLIST_FROM 都配置时发送；失败只记日志，名单已经落库不受影响。
 * 这是发给站长的内部通知，不是发给访客，不触碰“页面只读、不发信给访客”的红线。
 */
export async function notifyWaitlist(env: Env, email: string, locale: string, at: number): Promise<void> {
  const to = env.WAITLIST_TO?.trim();
  const from = env.WAITLIST_FROM?.trim();
  if (!env.EMAIL || !to || !from) return;

  const date = new Date(at);
  const lines = [
    `From: InboxShare <${from}>`,
    `To: ${to}`,
    `Subject: [InboxShare] Hosted waitlist: ${email}`,
    `Date: ${date.toUTCString()}`,
    `Message-ID: <waitlist-${at}-${Math.random().toString(36).slice(2)}@${from.split('@')[1]}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    'New signup for the hosted version of InboxShare.',
    '',
    `Email:  ${email}`,
    `Locale: ${locale}`,
    `Time:   ${date.toISOString()}`,
    '',
  ];
  try {
    await env.EMAIL.send(new EmailMessage(from, to, lines.join('\r\n')));
  } catch (err) {
    console.error('waitlist notify failed', err);
  }
}
