/**
 * 密码生成器 - React Native 版本
 */

import { randomBytes } from './crypto';
import { PasswordConfig } from '../types/models';

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

const AMBIGUOUS_CHARS = 'O0l1I|';

/**
 * 生成随机密码
 */
export function generatePassword(config: PasswordConfig): string {
  let charset = '';

  if (config.uppercase) charset += CHAR_SETS.uppercase;
  if (config.lowercase) charset += CHAR_SETS.lowercase;
  if (config.numbers) charset += CHAR_SETS.numbers;
  if (config.special) charset += CHAR_SETS.special;

  if (charset.length === 0) {
    charset = CHAR_SETS.lowercase + CHAR_SETS.numbers;
  }

  // 移除易混淆字符
  if (config.excludeAmbiguous) {
    charset = charset
      .split('')
      .filter((c) => !AMBIGUOUS_CHARS.includes(c))
      .join('');
  }

  // 生成密码
  const bytes = randomBytes(config.length);
  let password = '';

  for (let i = 0; i < config.length; i++) {
    const index = bytes[i] % charset.length;
    password += charset[index];
  }

  // 确保包含所有选中的字符类型
  const requiredChars: string[] = [];
  if (config.uppercase) requiredChars.push(getRandomChar(CHAR_SETS.uppercase));
  if (config.lowercase) requiredChars.push(getRandomChar(CHAR_SETS.lowercase));
  if (config.numbers) requiredChars.push(getRandomChar(CHAR_SETS.numbers));
  if (config.special) requiredChars.push(getRandomChar(CHAR_SETS.special));

  // 替换密码中的随机位置
  const passwordArray = password.split('');
  for (let i = 0; i < requiredChars.length && i < passwordArray.length; i++) {
    const pos = randomBytes(1)[0] % passwordArray.length;
    passwordArray[pos] = requiredChars[i];
  }

  return passwordArray.join('');
}

function getRandomChar(charset: string): string {
  const index = randomBytes(1)[0] % charset.length;
  return charset[index];
}

/**
 * 计算密码强度
 */
export function calculateStrength(password: string): {
  score: number;
  level: string;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  // 长度评分
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (password.length < 8) feedback.push('密码长度至少 8 位');

  // 字符类型评分
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // 复杂度检查
  if (!/[A-Z]/.test(password)) feedback.push('建议包含大写字母');
  if (!/[0-9]/.test(password)) feedback.push('建议包含数字');
  if (!/[^a-zA-Z0-9]/.test(password)) feedback.push('建议包含特殊字符');

  // 常见模式检查
  if (/^[a-z]+$/.test(password) || /^[0-9]+$/.test(password)) {
    score = Math.max(0, score - 2);
    feedback.push('避免使用纯字母或纯数字');
  }

  // 归一化分数 (0-4)
  const normalizedScore = Math.min(4, Math.floor(score / 2));

  const levels = ['很弱', '弱', '中等', '强', '很强'];

  return {
    score: normalizedScore,
    level: levels[normalizedScore],
    feedback,
  };
}

/**
 * 默认密码配置
 */
export const DEFAULT_PASSWORD_CONFIG: PasswordConfig = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  special: true,
  excludeAmbiguous: true,
};
