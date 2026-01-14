/**
 * 夸克网盘 SDK 配置
 * 逆向接口配置，如果夸克调整接口需要在这里修改
 */

import { QuarkConfig } from './types';

// 默认配置
export const DEFAULT_CONFIG: QuarkConfig = {
  // 主 API 地址
  apiBase: 'https://drive-pc.quark.cn/1/clouddrive',
  // Referer 头
  referer: 'https://pan.quark.cn/',
  // Origin 头
  origin: 'https://pan.quark.cn',
  // User-Agent（模拟 PC 浏览器）
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

// 账户信息 API
export const ACCOUNT_INFO_URL = 'https://pan.quark.cn/account/info';

// 关键 Cookie 名称（用于 API 认证）
// 如果夸克调整认证方式，需要修改这里
export const KEY_COOKIES = [
  '__pus',
  '__puus', 
  '__kp',
  '__kps',
  '__ktd',
  '__uid',
  '_UP_A4A_11_',
  '_UP_D_',
  '_UP_F7E_8D_',
];

// OSS 上传配置
export const OSS_CONFIG = {
  // OSS 域名后缀
  ossDomain: '.pds.quark.cn',
  // OSS User-Agent
  ossUserAgent: 'aliyun-sdk-js/1.0.0 Chrome 126.0.0.0 on Windows 10 64-bit',
  // 默认分片大小 4MB
  defaultPartSize: 4194304,
};

// API 端点
export const API_ENDPOINTS = {
  // 文件操作
  createFolder: '/file',
  listFiles: '/file/sort',
  deleteFile: '/file/delete',
  
  // 上传相关
  preUpload: '/file/upload/pre',
  updateHash: '/file/update/hash',
  uploadAuth: '/file/upload/auth',
  uploadFinish: '/file/upload/finish',
  
  // 下载
  download: '/file/download',
};

// 请求通用参数
export const COMMON_PARAMS = {
  pr: 'ucpro',
  fr: 'pc',
};
