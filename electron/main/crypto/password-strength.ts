/**
 * 密码强度检查模块
 * 用于验证主密码强度
 */

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;  // 0=很弱, 1=弱, 2=中等, 3=强, 4=很强
  level: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
  feedback: string[];
  isAcceptable: boolean;  // score >= 2 为可接受
}

// 常见弱密码列表
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123',
  'password1', '111111', '123123', 'admin', 'letmein',
  'welcome', 'monkey', 'dragon', 'master', 'login',
  '1234567890', 'password123', 'qwerty123', 'admin123'
]);

/**
 * 检查密码强度
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // 检查长度
  if (password.length >= 8) {
    score++;
  } else {
    feedback.push('密码长度至少8位');
  }

  if (password.length >= 12) {
    score++;
  } else if (password.length >= 8) {
    feedback.push('建议密码长度12位以上');
  }

  // 检查字符类型
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

  if (hasUppercase) {
    score += 0.5;
  } else {
    feedback.push('建议包含大写字母');
  }

  if (hasLowercase) {
    score += 0.5;
  } else {
    feedback.push('建议包含小写字母');
  }

  if (hasNumbers) {
    score += 0.5;
  } else {
    feedback.push('建议包含数字');
  }

  if (hasSpecial) {
    score += 0.5;
  } else {
    feedback.push('建议包含特殊字符');
  }

  // 检查常见密码
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    score = Math.max(0, score - 2);
    feedback.unshift('这是一个常见的弱密码');
  }

  // 检查重复字符
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 0.5);
    feedback.push('避免连续重复字符');
  }

  // 检查连续字符
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    score = Math.max(0, score - 0.5);
    feedback.push('避免连续字符序列');
  }

  // 四舍五入并限制范围
  const finalScore = Math.min(4, Math.max(0, Math.round(score))) as 0 | 1 | 2 | 3 | 4;

  // 确定等级
  const levels: Record<number, 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong'> = {
    0: 'very-weak',
    1: 'weak',
    2: 'medium',
    3: 'strong',
    4: 'very-strong'
  };

  return {
    score: finalScore,
    level: levels[finalScore],
    feedback: feedback.slice(0, 3), // 最多返回3条建议
    isAcceptable: finalScore >= 2
  };
}

/**
 * 获取强度等级的中文描述
 */
export function getStrengthLabel(level: PasswordStrength['level']): string {
  const labels: Record<PasswordStrength['level'], string> = {
    'very-weak': '很弱',
    'weak': '弱',
    'medium': '中等',
    'strong': '强',
    'very-strong': '很强'
  };
  return labels[level];
}

/**
 * 获取强度等级的颜色
 */
export function getStrengthColor(level: PasswordStrength['level']): string {
  const colors: Record<PasswordStrength['level'], string> = {
    'very-weak': '#ef4444',  // red
    'weak': '#f97316',       // orange
    'medium': '#eab308',     // yellow
    'strong': '#22c55e',     // green
    'very-strong': '#10b981' // emerald
  };
  return colors[level];
}
