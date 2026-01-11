/**
 * 夸克云盘认证管理模块
 * 处理登录窗口、Cookie存储和验证
 */

import { BrowserWindow, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { encrypt, decrypt, getDerivedKey, isUnlocked } from '../crypto';
import { QuarkClient } from './quark-api';
import { SyncAuthState } from './types';
import { EncryptedData } from '../storage/models';

// Cookie存储文件名
const COOKIE_FILE = 'sync_auth.dat';

// 夸克网盘登录URL
const QUARK_LOGIN_URL = 'https://pan.quark.cn';

// 关键Cookie名称（用于API认证）
const KEY_COOKIES = ['__pus', '__puus', '__kp', '__kps', '__ktd', '__uid', '_UP_A4A_11_', '_UP_D_', '_UP_F7E_8D_'];

export class SyncAuthManager {
  private cookieFilePath: string;
  private cachedCookie: string | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.cookieFilePath = path.join(userDataPath, COOKIE_FILE);
  }

  /**
   * 打开夸克网盘登录窗口
   * 返回登录成功后的Cookie
   */
  async openLoginWindow(): Promise<string> {
    return new Promise((resolve, reject) => {
      const loginSession = session.fromPartition('persist:quark-login');
      loginSession.clearStorageData();

      const loginWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        title: '登录夸克网盘',
        webPreferences: {
          session: loginSession,
          nodeIntegration: false,
          contextIsolation: true,
        },
        autoHideMenuBar: true,
      });

      let isResolved = false;
      const capturedCookies = new Map<string, string>();

      // 监听网络响应，捕获 Set-Cookie 头
      loginSession.webRequest.onHeadersReceived((details, callback) => {
        const setCookieHeaders = details.responseHeaders?.['set-cookie'] || 
                                  details.responseHeaders?.['Set-Cookie'] || [];
        
        for (const cookieHeader of setCookieHeaders) {
          const match = cookieHeader.match(/^([^=]+)=([^;]*)/);
          if (match) {
            capturedCookies.set(match[1], match[2]);
          }
        }
        callback({ cancel: false });
      });

      // 检查登录状态
      const checkLoginStatus = async () => {
        if (isResolved) return;
        
        try {
          // 从多个域名获取 Cookie
          const cookieDomains = [
            { domain: '.quark.cn' },
            { domain: 'pan.quark.cn' },
            { domain: 'drive-pc.quark.cn' },
            {}
          ];
          
          const cookieMap = new Map<string, string>();
          
          // 从 session 获取 Cookie
          for (const filter of cookieDomains) {
            try {
              const cookies = await loginSession.cookies.get(filter);
              for (const c of cookies) {
                if (c.domain?.includes('quark') || c.domain?.includes('uc')) {
                  cookieMap.set(c.name, c.value);
                }
              }
            } catch {
              // 忽略
            }
          }
          
          // 合并网络捕获的 Cookie（优先级更高）
          for (const [name, value] of capturedCookies) {
            cookieMap.set(name, value);
          }
          
          // 检查是否有关键 Cookie
          const hasKeyCookies = cookieMap.has('__pus') && cookieMap.has('__puus');
          
          if (cookieMap.size > 0 && hasKeyCookies) {
            // 构建 Cookie 字符串，关键 Cookie 放前面
            const cookieParts: string[] = [];
            for (const key of KEY_COOKIES) {
              if (cookieMap.has(key)) {
                cookieParts.push(`${key}=${cookieMap.get(key)}`);
              }
            }
            for (const [name, value] of cookieMap) {
              if (!KEY_COOKIES.includes(name)) {
                cookieParts.push(`${name}=${value}`);
              }
            }
            
            const cookieString = cookieParts.join('; ');

            // 验证 Cookie 是否有效
            const client = new QuarkClient(cookieString);
            const result = await client.validateCookie();

            if (result.valid) {
              isResolved = true;
              clearInterval(checkInterval);
              loginWindow.close();
              resolve(cookieString);
            }
          }
        } catch (error) {
          console.error('[SyncAuth] 检查登录状态出错:', error);
        }
      };

      // 定期检查登录状态
      const checkInterval = setInterval(checkLoginStatus, 2000);

      // 页面跳转时检查
      loginWindow.webContents.on('did-navigate', (_event, url) => {
        if (url.includes('pan.quark.cn') && !url.includes('login')) {
          setTimeout(checkLoginStatus, 2000);
          setTimeout(checkLoginStatus, 4000);
        }
      });

      // 窗口关闭时清理
      loginWindow.on('closed', () => {
        clearInterval(checkInterval);
        if (!isResolved) {
          reject(new Error('登录窗口已关闭'));
        }
      });

      loginWindow.loadURL(QUARK_LOGIN_URL);
    });
  }

  /**
   * 保存Cookie（加密存储）
   */
  async saveCookie(cookie: string): Promise<void> {
    if (!isUnlocked()) {
      throw new Error('密码库未解锁，无法保存Cookie');
    }

    const key = getDerivedKey();
    const encrypted = encrypt(cookie, key);
    fs.writeFileSync(this.cookieFilePath, JSON.stringify(encrypted), 'utf8');
    this.cachedCookie = cookie;
  }

  /**
   * 获取Cookie（解密）
   */
  async getCookie(): Promise<string | null> {
    if (this.cachedCookie) {
      return this.cachedCookie;
    }

    if (!fs.existsSync(this.cookieFilePath)) {
      return null;
    }

    if (!isUnlocked()) {
      throw new Error('密码库未解锁，无法读取Cookie');
    }

    try {
      const key = getDerivedKey();
      const data = fs.readFileSync(this.cookieFilePath, 'utf8');
      const encrypted: EncryptedData = JSON.parse(data);
      const cookie = decrypt(encrypted, key);
      this.cachedCookie = cookie;
      return cookie;
    } catch {
      return null;
    }
  }

  /**
   * 清除Cookie
   */
  async clearCookie(): Promise<void> {
    if (fs.existsSync(this.cookieFilePath)) {
      fs.unlinkSync(this.cookieFilePath);
    }
    this.cachedCookie = null;
  }

  /**
   * 获取认证状态
   */
  async getAuthState(): Promise<SyncAuthState> {
    try {
      const cookie = await this.getCookie();
      
      if (!cookie) {
        return { isAuthenticated: false };
      }

      const client = new QuarkClient(cookie);
      const result = await client.validateCookie();

      if (result.valid) {
        return {
          isAuthenticated: true,
          nickname: result.nickname,
          lastValidated: new Date().toISOString()
        };
      }
      return { isAuthenticated: false };
    } catch {
      return { isAuthenticated: false };
    }
  }

  /**
   * 绑定夸克云盘
   */
  async bind(): Promise<{ success: boolean; nickname?: string; error?: string }> {
    try {
      const cookie = await this.openLoginWindow();
      const client = new QuarkClient(cookie);
      const result = await client.validateCookie();
      
      if (!result.valid) {
        return { success: false, error: '登录验证失败' };
      }

      await this.saveCookie(cookie);
      return { success: true, nickname: result.nickname };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '绑定失败' 
      };
    }
  }

  /**
   * 解绑夸克云盘
   */
  async unbind(): Promise<void> {
    await this.clearCookie();
    
    try {
      const loginSession = session.fromPartition('persist:quark-login');
      await loginSession.clearStorageData();
    } catch {
      // 忽略
    }
  }

  /**
   * 获取已验证的QuarkClient实例
   */
  async getClient(): Promise<QuarkClient | null> {
    const cookie = await this.getCookie();
    if (!cookie) {
      return null;
    }
    return new QuarkClient(cookie);
  }

  /**
   * 使用手动输入的Cookie绑定夸克云盘
   * @param cookie 用户手动输入的Cookie字符串
   */
  async bindWithCookie(cookie: string): Promise<{ success: boolean; nickname?: string; error?: string }> {
    try {
      // 清理Cookie字符串（去除首尾空白）
      const cleanedCookie = cookie.trim();
      
      if (!cleanedCookie) {
        return { success: false, error: 'Cookie不能为空' };
      }

      // 验证Cookie是否有效
      const client = new QuarkClient(cleanedCookie);
      const result = await client.validateCookie();
      
      if (!result.valid) {
        return { success: false, error: 'Cookie无效或已过期，请重新获取' };
      }

      // 保存Cookie
      await this.saveCookie(cleanedCookie);
      return { success: true, nickname: result.nickname };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '绑定失败' 
      };
    }
  }
}

// 单例实例
let authManagerInstance: SyncAuthManager | null = null;

export function getSyncAuthManager(): SyncAuthManager {
  if (!authManagerInstance) {
    authManagerInstance = new SyncAuthManager();
  }
  return authManagerInstance;
}
