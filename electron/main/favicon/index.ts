import { net } from 'electron';

// 关键词到图标的映射
const KEYWORD_ICONS: Record<string, string> = {
  // 社交媒体
  'github': '🐙',
  'gitlab': '🦊',
  'twitter': '🐦',
  'facebook': '📘',
  'instagram': '📷',
  'linkedin': '💼',
  'discord': '🎮',
  'slack': '💬',
  'telegram': '✈️',
  'whatsapp': '💬',
  'wechat': '💬',
  'weixin': '💬',
  '微信': '💬',
  'qq': '🐧',
  'weibo': '📱',
  '微博': '📱',
  
  // 邮箱
  'gmail': '📧',
  'outlook': '📧',
  'hotmail': '📧',
  'mail': '📧',
  'email': '📧',
  '邮箱': '📧',
  '邮件': '📧',
  
  // 购物
  'amazon': '📦',
  'taobao': '🛒',
  '淘宝': '🛒',
  'jd': '🛒',
  '京东': '🛒',
  'tmall': '🛒',
  '天猫': '🛒',
  'pinduoduo': '🛒',
  '拼多多': '🛒',
  'shop': '🛒',
  'store': '🛒',
  '购物': '🛒',
  '商城': '🛒',
  
  // 金融
  'bank': '🏦',
  '银行': '🏦',
  'alipay': '💳',
  '支付宝': '💳',
  'paypal': '💳',
  'pay': '💳',
  '支付': '💳',
  'finance': '💰',
  '金融': '💰',
  'stock': '📈',
  '股票': '📈',
  'crypto': '🪙',
  'bitcoin': '🪙',
  
  // 视频/娱乐
  'youtube': '▶️',
  'netflix': '🎬',
  'bilibili': '📺',
  'b站': '📺',
  'douyin': '🎵',
  '抖音': '🎵',
  'tiktok': '🎵',
  'spotify': '🎵',
  'music': '🎵',
  '音乐': '🎵',
  'video': '🎬',
  '视频': '🎬',
  'game': '🎮',
  '游戏': '🎮',
  'steam': '🎮',
  'epic': '🎮',
  
  // 工作/办公
  'office': '📄',
  'microsoft': '🪟',
  'google': '🔍',
  'apple': '🍎',
  'icloud': '☁️',
  'dropbox': '📦',
  'drive': '💾',
  '云盘': '☁️',
  'cloud': '☁️',
  'work': '💼',
  '工作': '💼',
  '办公': '📄',
  
  // 开发
  'dev': '💻',
  'code': '💻',
  'npm': '📦',
  'docker': '🐳',
  'aws': '☁️',
  'azure': '☁️',
  'server': '🖥️',
  '服务器': '🖥️',
  'api': '🔌',
  'database': '🗄️',
  '数据库': '🗄️',
  
  // 学习/教育
  'edu': '🎓',
  'school': '🏫',
  '学校': '🏫',
  '大学': '🎓',
  'university': '🎓',
  'learn': '📚',
  '学习': '📚',
  'course': '📚',
  '课程': '📚',
  
  // 其他
  'vpn': '🔐',
  'password': '🔑',
  '密码': '🔑',
  'admin': '👤',
  '管理': '⚙️',
  'setting': '⚙️',
  '设置': '⚙️',
  'home': '🏠',
  '首页': '🏠',
  'wifi': '📶',
  'router': '📶',
  '路由': '📶',
};

/**
 * 从 URL 提取域名
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * 根据关键词匹配图标
 */
export function matchIconByKeyword(title: string, url?: string): string | null {
  const searchText = `${title} ${url || ''}`.toLowerCase();
  
  for (const [keyword, icon] of Object.entries(KEYWORD_ICONS)) {
    if (searchText.includes(keyword.toLowerCase())) {
      return icon;
    }
  }
  
  return null;
}

/**
 * 获取网站 Favicon
 * 使用 Google Favicon 服务或直接获取
 */
export async function fetchFavicon(url: string): Promise<string | null> {
  const domain = extractDomain(url);
  if (!domain) return null;

  // 尝试多个 favicon 来源
  const faviconUrls = [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    `https://icon.horse/icon/${domain}`,
    `https://${domain}/favicon.ico`,
  ];

  for (const faviconUrl of faviconUrls) {
    try {
      const base64 = await fetchImageAsBase64(faviconUrl);
      if (base64) return base64;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * 获取图片并转为 base64
 */
function fetchImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const request = net.request(url);
    const chunks: Buffer[] = [];
    
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        resolve(null);
        return;
      }

      const contentType = response.headers['content-type'];
      const mimeType = Array.isArray(contentType) ? contentType[0] : contentType || 'image/png';

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          // 检查是否是有效图片（至少有一些数据）
          if (buffer.length < 100) {
            resolve(null);
            return;
          }
          const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
          resolve(base64);
        } catch {
          resolve(null);
        }
      });

      response.on('error', () => resolve(null));
    });

    request.on('error', () => resolve(null));
    
    // 设置超时
    setTimeout(() => {
      request.abort();
      resolve(null);
    }, 5000);

    request.end();
  });
}

/**
 * 智能获取图标：优先 Favicon，失败则关键词匹配
 */
export async function getSmartIcon(title: string, url?: string): Promise<{ icon: string | null; source: 'favicon' | 'keyword' | 'none' }> {
  // 1. 如果有 URL，先尝试获取 favicon
  if (url) {
    const favicon = await fetchFavicon(url);
    if (favicon) {
      return { icon: favicon, source: 'favicon' };
    }
  }

  // 2. 尝试关键词匹配
  const keywordIcon = matchIconByKeyword(title, url);
  if (keywordIcon) {
    return { icon: keywordIcon, source: 'keyword' };
  }

  // 3. 都没有
  return { icon: null, source: 'none' };
}
