// 验证码识别与邮件分类的用例检查：pnpm test:classify
import { classify } from '../src/classify.ts';
import { detectCode } from '../src/code.ts';

const codeCases: Array<[string, string, string | null]> = [
  ['你的登录验证码', '你的一次性验证码是 482913，10 分钟内有效。', '482913'],
  ['121', '1212', null],
  ['Your Netflix temporary access code', 'Enter this code: 4821. It expires in 15 minutes.', '4821'],
  ['Order #48213 shipped', 'Your order 48213 has shipped on 2026-10-28.', null],
  ['Verify your email', 'Your verification code is 123-456', '123456'],
  ['登录提醒', '2026 年 10 月 28 日有一次新设备登录', null],
  ['Sign in to ChatGPT', 'Your one-time code is\n\n736105\n\nThis code expires in 10 minutes.', '736105'],
];

const classifyCases: Array<[string, string, boolean, string]> = [
  ['你的登录验证码', '验证码是 482913', true, 'code'],
  ['Reset your password', 'Click here to reset your password: https://x', false, 'reset'],
  ['重置密码', '你的重置验证码 123456', true, 'reset'],
  ['Your receipt from Netflix', 'Invoice #1234 payment received', false, 'billing'],
  ['New sign-in to your account', 'A new device signed in from Berlin', false, 'security'],
  ['邮箱已更改', '你的账户邮箱已变更为 ...', false, 'security'],
  ['Dgghhh', 'Cgghhj -- sent with Tuta', false, 'other'],
  ['Your Netflix temporary access code', 'Enter this code: 4821', true, 'code'],
  ['Welcome to ChatGPT', 'Your one-time code is 736105', true, 'code'],
  ['订单确认', '您的订单 48213 已发货', false, 'billing'],
];

let failed = 0;
for (const [subject, text, want] of codeCases) {
  const got = detectCode(subject, text);
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} code     ${JSON.stringify(subject)} -> ${got}${ok ? '' : ` (want ${want})`}`);
}
for (const [subject, text, hasCode, want] of classifyCases) {
  const got = classify(subject, text, hasCode);
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} classify ${JSON.stringify(subject)} -> ${got}${ok ? '' : ` (want ${want})`}`);
}
if (failed) {
  console.error(`${failed} case(s) failed`);
  process.exit(1);
}
