/**
 * 邮件分类。分享链接默认只展示登录验证码和普通邮件，
 * 密码重置、账单、账户安全变更这三类默认隐藏：拿到链接的人不该能借此接管账号或看到付款信息。
 */

export type Category = 'code' | 'reset' | 'billing' | 'security' | 'other';

export const SENSITIVE_CATEGORIES: readonly Category[] = ['reset', 'billing', 'security'];

const RESET =
  /(reset|forgot|forgotten|change|update|recover)\b.{0,24}\bpassword|password\b.{0,24}\b(reset|change|recovery)|重置密码|找回密码|修改密码|密码重置|密码找回|重設密碼|パスワード.{0,6}(リセット|再設定|変更)|비밀번호.{0,6}(재설정|변경)/i;

const SECURITY =
  /(new|unrecognized|unusual|suspicious)\s+(sign[- ]?in|log[- ]?in|device|location)|security (alert|notice|notification)|(email|e-mail|phone|password|recovery (email|phone)|2fa|two[- ]factor)\b.{0,24}\b(was |has been |were )?(changed|updated|removed|added|enabled|disabled)|account (was |has been )?(changed|updated|closed|deleted|deactivated|locked)|recovery code|backup code|安全提醒|安全警报|新设备登录|异常登录|陌生设备|邮箱已(更改|变更|修改)|账户(已)?(变更|更改|注销|锁定)|两步验证|双重验证|恢复码|备用码/i;

const BILLING =
  /\binvoice\b|\breceipt\b|payment (received|failed|declined|due|confirmation)|billing|your (order|purchase)|order (confirmation|shipped)|subscription (renewed|renewal|cancel|expir|payment)|refund|charged|账单|发票|付款|扣款|支付成功|订单|订阅(已|将)|续费|退款|收据/i;

/**
 * @param hasCode 已识别出验证码或操作链接。验证码邮件的正文结尾常带“如果不是你，请登出不认识的设备 / 更改密码”
 *   这类安全提示（Netflix 的暂时存取码邮件就是），所以这种邮件只看主题和正文开头，不让结尾的提示把它藏起来。
 */
export function classify(subject: string | null, text: string | null, hasCode: boolean): Category {
  const subj = subject ?? '';
  const body = (text ?? '').slice(0, hasCode ? 300 : 2000);
  const both = `${subj}\n${body}`;
  // 主题命中优先级最高；正文只在主题没结论时参考
  if (RESET.test(subj) || RESET.test(body)) return 'reset';
  if (SECURITY.test(subj) || SECURITY.test(body)) return 'security';
  if (BILLING.test(subj) || BILLING.test(both.slice(0, 600))) return 'billing';
  return hasCode ? 'code' : 'other';
}
