/**
 * 从主题和纯文本正文里识别验证码。
 *
 * 规则刻意保守：邮件里必须出现“验证码 / code / OTP”一类的词，才会把 4～8 位数字当作验证码，
 * 避免把订单号、年份、普通数字当成验证码展示。
 */

/** “这封邮件在说验证码”的用词；src/link.ts 也用它判断主题是否像验证码邮件 */
export const KEYWORD =
  /(验证码|校验码|动态码|确认码|一次性|驗證碼|存取碼|存取码|認証コード|인증|verification|verify|one[- ]time|passcode|security code|login code|sign[- ]?in code|access code|\bcode\b|\botp\b|\bpin\b)/i;

/** 4～8 位数字，或 3+3 中间带空格/连字符；前后不能紧挨着数字或连字符（排除长串号码的一部分） */
const CANDIDATE = /(?<![\d-])(\d{3}[ -]\d{3}|\d{4,8})(?![\d-])/g;

const YEAR = /^(19|20)\d{2}$/;

interface Candidate {
  value: string;
  score: number;
}

function scan(source: string, baseScore: number, out: Candidate[]): void {
  CANDIDATE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CANDIDATE.exec(source))) {
    const raw = m[1];
    const value = raw.replace(/[ -]/g, '');
    const before = source.slice(Math.max(0, m.index - 80), m.index);
    const after = source.slice(m.index + raw.length, m.index + raw.length + 40);
    const nearKeyword = KEYWORD.test(before) || KEYWORD.test(after);
    let score = baseScore;
    if (nearKeyword) score += 10;
    if (value.length === 6) score += 3;
    else if (value.length === 4 || value.length === 5) score += 1;
    if (YEAR.test(value) && !nearKeyword) score -= 20;
    out.push({ value, score });
  }
}

export function detectCode(subject: string | null, text: string | null): string | null {
  const subj = subject ?? '';
  const body = (text ?? '').slice(0, 4000);
  if (!KEYWORD.test(subj) && !KEYWORD.test(body)) return null;

  const candidates: Candidate[] = [];
  scan(subj, 5, candidates);
  scan(body, 0, candidates);
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return best.score > 0 ? best.value : null;
}
