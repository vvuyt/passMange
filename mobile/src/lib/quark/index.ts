/**
 * 夸克网盘 SDK
 * 
 * 独立模块，可跨平台复用（React Native / Electron / Node.js）
 * 
 * 使用方法：
 * ```typescript
 * import { QuarkClient } from '@/lib/quark';
 * 
 * const client = new QuarkClient(cookie);
 * 
 * // 验证 Cookie
 * const user = await client.validateCookie();
 * 
 * // 上传文件
 * const fileId = await client.uploadFile('test.txt', data, folderId);
 * 
 * // 下载文件
 * const content = await client.downloadFile(fileId);
 * ```
 * 
 * 如果夸克调整接口，修改 config.ts 中的配置即可
 */

export { QuarkClient } from './client';
export * from './types';
export * from './config';
