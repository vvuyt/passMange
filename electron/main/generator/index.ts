/**
 * 密码生成器模块
 * 提供安全随机密码生成和强度计算功能
 */

import crypto from 'crypto';
import { PasswordConfig } from '../storage/models';

// 字符集
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// 易混淆字符
const AMBIGUOUS = 'O0Il1';

/**
 * 生成安全随机密码
 */
export function generatePassword(config: PasswordConfig): string {
  let charset = '';
  const requiredChars: string[] = [];

  // 构建字符集并确保每种类型至少有一个字符
  if (config.uppercase) {
    let chars = UPPERCASE;
    if (config.excludeAmbiguous) {
      chars = chars.split('').filter(c => !AMBIGUOUS.includes(c)).join('');
    }
    charset += chars;
    requiredChars.push(getRandomChar(chars));
  }

  if (config.lowercase) {
    let chars = LOWERCASE;
    if (config.excludeAmbiguous) {
      chars = chars.split('').filter(c => !AMBIGUOUS.includes(c)).join('');
    }
    charset += chars;
    requiredChars.push(getRandomChar(chars));
  }

  if (config.numbers) {
    let chars = NUMBERS;
    if (config.excludeAmbiguous) {
      chars = chars.split('').filter(c => !AMBIGUOUS.includes(c)).join('');
    }
    charset += chars;
    requiredChars.push(getRandomChar(chars));
  }

  if (config.special) {
    charset += SPECIAL;
    requiredChars.push(getRandomChar(SPECIAL));
  }

  // 如果没有选择任何字符类型，默认使用小写字母
  if (charset.length === 0) {
    charset = LOWERCASE;
  }

  // 生成剩余的随机字符
  const remainingLength = Math.max(0, config.length - requiredChars.length);
  const randomChars: string[] = [];
  
  for (let i = 0; i < remainingLength; i++) {
    randomChars.push(getRandomChar(charset));
  }

  // 合并并打乱顺序
  const allChars = [...requiredChars, ...randomChars];
  return shuffleArray(allChars).join('');
}


/**
 * 从字符集中获取一个安全随机字符
 */
function getRandomChar(charset: string): string {
  const randomIndex = crypto.randomInt(0, charset.length);
  return charset[randomIndex];
}

/**
 * Fisher-Yates 洗牌算法（使用安全随机数）
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 密码强度等级
 */
export type StrengthLevel = 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';

/**
 * 密码强度结果
 */
export interface StrengthResult {
  score: number;      // 0-100
  level: StrengthLevel;
  feedback: string[];
}

/**
 * 计算密码强度
 */
export function calculateStrength(password: string): StrengthResult {
  let score = 0;
  const feedback: string[] = [];

  // 长度评分 (最高 30 分)
  if (password.length >= 16) {
    score += 30;
  } else if (password.length >= 12) {
    score += 25;
  } else if (password.length >= 8) {
    score += 15;
  } else if (password.length >= 6) {
    score += 10;
  } else {
    feedback.push('密码太短，建议至少 8 个字符');
  }

  // 字符多样性评分 (最高 40 分)
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (hasUpper) score += 10;
  else feedback.push('添加大写字母可增强安全性');

  if (hasLower) score += 10;
  else feedback.push('添加小写字母可增强安全性');

  if (hasNumber) score += 10;
  else feedback.push('添加数字可增强安全性');

  if (hasSpecial) score += 10;
  else feedback.push('添加特殊字符可增强安全性');

  // 复杂度评分 (最高 30 分)
  const uniqueChars = new Set(password).size;
  const uniqueRatio = uniqueChars / password.length;

  if (uniqueRatio >= 0.8) {
    score += 30;
  } else if (uniqueRatio >= 0.6) {
    score += 20;
  } else if (uniqueRatio >= 0.4) {
    score += 10;
  } else {
    feedback.push('避免重复字符');
  }

  // 检查常见模式
  if (/^[a-z]+$|^[A-Z]+$|^[0-9]+$/.test(password)) {
    score -= 20;
    feedback.push('避免只使用单一类型的字符');
  }

  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    feedback.push('避免连续重复的字符');
  }

  // 确保分数在 0-100 范围内
  score = Math.max(0, Math.min(100, score));

  // 确定强度等级
  let level: StrengthLevel;
  if (score >= 80) {
    level = 'very-strong';
  } else if (score >= 60) {
    level = 'strong';
  } else if (score >= 40) {
    level = 'fair';
  } else if (score >= 20) {
    level = 'weak';
  } else {
    level = 'very-weak';
  }

  return { score, level, feedback };
}

/**
 * 获取默认密码配置
 */
export function getDefaultConfig(): PasswordConfig {
  return {
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true,
    excludeAmbiguous: true,
  };
}
