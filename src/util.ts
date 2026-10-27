const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** 生成 URL 安全的随机串（64 字符表，每位 6 bit，32 位 ≈ 192 bit 熵） */
export function randomKey(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHABET[b & 63];
  return out;
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
