/**
 * 二维码临时分享模块
 */

import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { getEntry } from '../storage/entries';
import { ShareQRData } from '../storage/models';

// 活跃的分享会话
const activeSessions = new Map<string, {
  entryId: string;
  encryptedData: string;
  key: string;
  expiresAt: Date;
  timer: NodeJS.Timeout;
}>();

// 默认过期时间（秒）
const DEFAULT_TTL = 60;

/**
 * 加密分享数据
 */
function encryptShareData(data: string, key: Buffer): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted + '.' + authTag.toString('base64'),
    iv: iv.toString('base64'),
  };
}

/**
 * 创建分享二维码
 */
export async function createShareQR(
  entryId: string,
  ttl: number = DEFAULT_TTL
): Promise<ShareQRData> {
  // 获取密码条目
  const entry = getEntry(entryId);
  if (!entry) {
    throw new Error('密码条目不存在');
  }
  
  // 生成会话 ID 和加密密钥
  const sessionId = uuidv4();
  const key = crypto.randomBytes(32);
  
  // 准备分享数据（只包含必要信息）
  const shareData = {
    title: entry.title,
    username: entry.username,
    password: entry.password,
    url: entry.url,
  };
  
  // 加密数据（用于内部存储）
  const { encrypted, iv } = encryptShareData(JSON.stringify(shareData), key);
  
  // 计算过期时间
  const expiresAt = new Date(Date.now() + ttl * 1000);
  
  // 创建二维码数据 - 只包含密码
  const qrContent = entry.password;
  
  // 生成二维码
  const qrCodeBase64 = await QRCode.toDataURL(qrContent, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
  
  // 设置自动销毁定时器
  const timer = setTimeout(() => {
    destroyShare(sessionId);
  }, ttl * 1000);
  
  // 保存会话（加密数据仅用于内部记录）
  activeSessions.set(sessionId, {
    entryId,
    encryptedData: encrypted,
    key: key.toString('base64'),
    expiresAt,
    timer,
  });
  
  return {
    sessionId,
    qrCodeBase64,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * 销毁分享会话
 */
export function destroyShare(sessionId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return false;
  }
  
  // 清除定时器
  clearTimeout(session.timer);
  
  // 删除会话
  activeSessions.delete(sessionId);
  
  return true;
}

/**
 * 检查会话是否有效
 */
export function isShareValid(sessionId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return false;
  }
  
  return new Date() < session.expiresAt;
}

/**
 * 获取会话剩余时间（秒）
 */
export function getShareRemainingTime(sessionId: string): number {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return 0;
  }
  
  const remaining = Math.max(0, session.expiresAt.getTime() - Date.now());
  return Math.ceil(remaining / 1000);
}

/**
 * 获取所有活跃会话
 */
export function getActiveSessions(): Array<{
  sessionId: string;
  entryId: string;
  expiresAt: string;
  remainingSeconds: number;
}> {
  const sessions: Array<{
    sessionId: string;
    entryId: string;
    expiresAt: string;
    remainingSeconds: number;
  }> = [];
  
  activeSessions.forEach((session, sessionId) => {
    if (new Date() < session.expiresAt) {
      sessions.push({
        sessionId,
        entryId: session.entryId,
        expiresAt: session.expiresAt.toISOString(),
        remainingSeconds: getShareRemainingTime(sessionId),
      });
    }
  });
  
  return sessions;
}

/**
 * 销毁所有分享会话
 */
export function destroyAllShares(): number {
  let count = 0;
  
  activeSessions.forEach((session, sessionId) => {
    clearTimeout(session.timer);
    count++;
  });
  
  activeSessions.clear();
  
  return count;
}

/**
 * 清理过期会话
 */
export function cleanupExpiredSessions(): number {
  let cleaned = 0;
  const now = new Date();
  
  activeSessions.forEach((session, sessionId) => {
    if (now >= session.expiresAt) {
      clearTimeout(session.timer);
      activeSessions.delete(sessionId);
      cleaned++;
    }
  });
  
  return cleaned;
}
