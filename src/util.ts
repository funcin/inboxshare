const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** 生成 URL 安全的随机串（64 字符表，每位 6 bit，32 位 ≈ 192 bit 熵） */
export function randomKey(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHABET[b & 63];
  return out;
}

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** 只含字母数字的随机串（拒绝采样保证均匀，10 位 ≈ 59.5 bit 熵） */
export function randomAlnum(length: number): string {
  let out = '';
  while (out.length < length) {
    const bytes = new Uint8Array(length * 2);
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b < 248 && out.length < length) out += ALNUM[b % 62];
    }
  }
  return out;
}

/** 把邮箱用户名 / 备注压成只含小写字母数字的片段；中文等非 ASCII 字符会被丢掉，可能得到空串 */
export function slugPart(s: string, max: number): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, max);
}

/** 序号：第 0 个是 A，第 25 个是 Z，之后用数字 27、28… */
export function sequenceLabel(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

/**
 * 分享链接 key = 邮箱用户名 + 备注（没有可用备注则用序号）+ 10 位随机尾巴，例如 hidisneyK7qM2xP9aB。
 * 前缀只是为了好认，随机尾巴才是访问控制，不能去掉。
 */
export function buildShareKey(mailbox: string, label: string | null, existingCount: number): string {
  const local = slugPart(mailbox.split('@')[0] ?? '', 20) || 'inbox';
  let middle = slugPart(label ?? '', 16);
  // 备注和邮箱用户名一样（如 netflix-code 配备注 netflixcode）就不重复拼一遍，改用序号
  if (!middle || middle === local) middle = sequenceLabel(existingCount);
  return `${local}${middle}${randomAlnum(10)}`;
}

export function newMessageId(): string {
  return `msg_${randomKey(22)}`;
}

/** 常量时间比较，避免用 token 长度/前缀做计时猜测 */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.byteLength !== bb.byteLength) return false;
  return crypto.subtle.timingSafeEqual(ab, bb);
}

export function normalizeMailbox(address: string): string {
  return address.trim().toLowerCase();
}

export function isValidMailbox(address: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) && address.length <= 254;
}
