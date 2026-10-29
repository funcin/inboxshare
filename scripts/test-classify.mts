// 验证码识别与邮件分类的用例检查：pnpm test:classify
import { classify } from '../src/classify.ts';
import { detectCode } from '../src/code.ts';
import { detectActionLink } from '../src/link.ts';

// Netflix 暂时存取码：码不在邮件里，正文结尾带“登出不认识的设备 / 更改密码”的安全提示
const NETFLIX_ZH_TEXT =
  '您的暫時存取碼\n\n111，您好：\n\n我們收到下列裝置的暫時存取碼申請。\n\n如果是您或同住者提出申請，即可取得收看影片用的暫時存取碼。\n\n此代碼僅限旅行用或在 Netflix 同戶裝置以外的裝置暫時使用，請勿傳給其他人。\n\n111於10月19日上午12:22 (香港時間)透過 Realme - Android 手機 提出申請\n\n取得存取碼\nhttps://www.netflix.com/account/travel/verify?nftoken=ABC123\n\n* 連結將於 15 分鐘後失效。\n\n維護帳戶安全：如果不知道此人是誰，建議您立即登出不認得的裝置，您也可以更改密碼。\n\n我們樂意提供協助\n取消訂閱 https://www.netflix.com/unsubscribe?x=1\n';
const NETFLIX_EN_TEXT =
  'Your temporary access code\n\nHi,\n\nWe received a request for a temporary access code for the device below.\n\nIf this was you or someone in your household, go ahead and get the code to continue watching.\n\nNote: This code is for travel or temporary use on devices outside your Netflix Household. Do not share it with others.\n\nRequested on Oct 19 at 12:22 AM from Realme - Android Phone\n\nGet Code\nhttps://www.netflix.com/account/travel/verify?nftoken=XYZ\n\n* This link will expire in 15 minutes.\n\nKeep your account secure: If you don\'t know who this is, we recommend you sign out of unrecognized devices immediately. You can also change your password.\n';
const NETFLIX_HTML =
  '<html><body><table><tr><td><a href="https://www.netflix.com/" target="_blank"><img src="https://x/logo.png" alt="Netflix"></a></td></tr>'
  + '<tr><td><h1>您的暫時存取碼</h1><p>111，您好：</p><p>我們收到下列裝置的暫時存取碼申請。</p>'
  + '<p>此代碼僅限旅行用或在 Netflix 同戶裝置以外的裝置暫時使用，請勿傳給其他人。</p>'
  + '<table><tr><td><b>111於10月19日上午12:22 (香港時間)透過 Realme - Android 手機 提出申請</b></td></tr>'
  + '<tr><td><a href="https://www.netflix.com/account/travel/verify?nftoken=ABC123&amp;lnktrk=EVO" style="background:#e50914;color:#fff">取得存取碼</a></td></tr></table>'
  + '<p>* 連結將於 15 分鐘後失效。</p>'
  + '<p><b>維護帳戶安全：</b>如果不知道此人是誰，建議您立即<a href="https://www.netflix.com/manageDevices">登出不認得的裝置</a>，您也可以<a href="https://www.netflix.com/password">更改密碼</a>。</p>'
  + '<p>我們樂意提供協助 <a href="https://help.netflix.com/zh-tw">說明中心</a></p>'
  + '<p><a href="https://www.netflix.com/unsubscribe?x=1">取消訂閱</a> · <a href="https://www.netflix.com/privacy">隱私權</a></p></td></tr></table></body></html>';
const CONSOLE_TEXT = 'Sign in to Claude Console\n\nClick the button below to finish signing in. This link expires in 10 minutes.\n\nSign in: https://console.anthropic.com/magic-link?token=abc\n\nIf you didn\'t request this email, you can safely ignore it.\nNeed a hand? Contact Anthropic Support https://support.anthropic.com/\n';
const CONSOLE_HTML =
  '<html><body><p><img src="https://x/logo.png" alt="Claude Console"></p><h1>Sign in to Claude Console</h1>'
  + '<p>Click the button below to finish signing in. This link expires in 10 minutes.</p>'
  + '<p><a href="https://console.anthropic.com/magic-link?token=abc" style="background:#000;color:#fff">Sign in</a></p>'
  + '<p>If you didn\'t request this email, you can safely ignore it.</p><p>Need a hand? Contact <a href="https://support.anthropic.com/">Anthropic Support</a>.</p></body></html>';

const linkCases: Array<[string, string | null, string | null, string | null]> = [
  ['您的 Netflix 暫時存取碼', NETFLIX_ZH_TEXT, NETFLIX_HTML, 'https://www.netflix.com/account/travel/verify?nftoken=ABC123&lnktrk=EVO'],
  ['您的 Netflix 暫時存取碼', NETFLIX_ZH_TEXT, null, 'https://www.netflix.com/account/travel/verify?nftoken=ABC123'],
  ['Your Netflix temporary access code', NETFLIX_EN_TEXT, null, 'https://www.netflix.com/account/travel/verify?nftoken=XYZ'],
  ['Your secure link to the Claude Console is here', CONSOLE_TEXT, CONSOLE_HTML, 'https://console.anthropic.com/magic-link?token=abc'],
  ['Your secure link to the Claude Console is here', CONSOLE_TEXT, null, 'https://console.anthropic.com/magic-link?token=abc'],
  ['Was this you?', null, '<p>Someone signed in to Disney+.</p><p><a href="https://www.disneyplus.com/confirm?t=1"><img src="https://x/btn.png" alt="Yes, this was me"></a></p><p><a href="https://www.disneyplus.com/help">Help Center</a></p>', 'https://www.disneyplus.com/confirm?t=1'],
  // 新闻邮件的“Log in”按钮：主题不像验证码 / 登录链接邮件，不算操作链接
  ['Your weekly digest', null, '<p>Top stories this week.</p><p><a href="https://news.example/login">Log in</a> to read more.</p><p><a href="https://news.example/unsubscribe">Unsubscribe</a></p>', null],
  // 只有退订 / 帮助链接
  ['Your verification code', 'Your code is 123456.\n\nUnsubscribe: https://x.example/unsubscribe', null, null],
];

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
  // 验证码 / 操作链接邮件结尾的安全提示不能把它藏起来；同样内容没识别出码时仍按正文判
  ['您的 Netflix 暫時存取碼', NETFLIX_ZH_TEXT, true, 'code'],
  ['Your Netflix temporary access code', NETFLIX_EN_TEXT, true, 'code'],
  ['Your Netflix temporary access code', NETFLIX_EN_TEXT, false, 'reset'],
  ['Your secure link to the Claude Console is here', CONSOLE_TEXT, true, 'code'],
  // 主题就是重置密码的验证码邮件仍然隐藏
  ['Your password reset code', 'Use 482913 to reset your password.', true, 'reset'],
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
for (const [subject, text, html, want] of linkCases) {
  const got = detectActionLink(subject, text, html);
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} link     ${JSON.stringify(subject)}${html ? ' (html)' : ' (text)'} -> ${got}${ok ? '' : ` (want ${want})`}`);
}
if (failed) {
  console.error(`${failed} case(s) failed`);
  process.exit(1);
}
