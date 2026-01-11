/**
 * 夸克云盘API客户端
 * 基于Cookie认证，实现文件上传、下载、管理功能
 */

import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { QuarkConfig, QuarkFile, PreUploadResponse } from './types';

// 日志文件路径
const LOG_FILE = path.join(app.getPath('userData'), 'sync.log');

function log(...args: unknown[]) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`;
  fs.appendFileSync(LOG_FILE, message);
  console.log(...args);
}

const DEFAULT_CONFIG: QuarkConfig = {
  apiBase: 'https://drive-pc.quark.cn/1/clouddrive',
  referer: 'https://pan.quark.cn/',
  origin: 'https://pan.quark.cn',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.234 Electron/31.7.7 Safari/537.36'
};

export class QuarkClient {
  private cookie: string;
  private config: QuarkConfig;

  constructor(cookie: string, config: Partial<QuarkConfig> = {}) {
    this.cookie = cookie;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 发送API请求
   */
  private async request<T>(
    pathname: string,
    method: 'GET' | 'POST',
    data?: Record<string, unknown>,
    queryParams?: Record<string, string>
  ): Promise<T> {
    const url = new URL(this.config.apiBase + pathname);
    url.searchParams.set('pr', 'ucpro');
    url.searchParams.set('fr', 'pc');
    
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const headers: Record<string, string> = {
      'Cookie': this.cookie,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Referer': this.config.referer,
      'User-Agent': this.config.userAgent,
      'Origin': this.config.origin,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (method === 'POST' && data) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url.toString(), options);
    const text = await response.text();
    
    let json: { status?: number; code?: number | string; message?: string; data?: unknown } & T;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`响应解析失败: ${text.substring(0, 200)}`);
    }

    if (json.code !== undefined && json.code !== 0 && json.code !== 'OK') {
      throw new Error(json.message || `请求失败 (code: ${json.code})`);
    }

    return json as T;
  }

  /**
   * 验证Cookie有效性并获取用户信息
   */
  async validateCookie(): Promise<{ valid: boolean; nickname?: string }> {
    try {
      const url = new URL('https://pan.quark.cn/account/info');
      url.searchParams.set('fr', 'pc');
      url.searchParams.set('platform', 'pc');
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Cookie': this.cookie,
          'Accept': 'application/json, text/plain, */*',
          'Referer': this.config.referer,
          'User-Agent': this.config.userAgent,
        }
      });
      
      if (response.status !== 200) {
        return { valid: false };
      }
      
      const json = await response.json() as {
        success?: boolean;
        code?: string | number;
        data?: { nickname?: string };
      };
      
      if ((json.success === true || json.code === 'OK') && json.data) {
        return {
          valid: true,
          nickname: json.data.nickname || '夸克用户'
        };
      }
      
      return { valid: false };
    } catch {
      return { valid: false };
    }
  }

  /**
   * 创建文件夹
   */
  async createFolder(folderName: string, parentId: string = '0'): Promise<string> {
    const response = await this.request<{
      data: { fid: string };
    }>('/file', 'POST', {
      pdir_fid: parentId,
      file_name: folderName,
      dir_path: '',
      dir_init_lock: false
    });

    return response.data.fid;
  }

  /**
   * 列出目录文件
   */
  async listFiles(folderId: string = '0'): Promise<QuarkFile[]> {
    const response = await this.request<{
      data: { list: Array<{
        fid: string;
        file_name: string;
        size: number;
        created_at: number;
        updated_at: number;
        file_type: number;
        dir: boolean;
      }> };
    }>('/file/sort', 'GET', undefined, {
      pdir_fid: folderId,
      _page: '1',
      _size: '50',
      _fetch_total: '1',
      _fetch_sub_dirs: '0',
      _sort: 'file_type:asc,updated_at:desc'
    });

    return (response.data?.list || []).map(item => ({
      fid: item.fid,
      fileName: item.file_name,
      fileSize: item.size,
      createdAt: new Date(item.created_at).toISOString(),
      updatedAt: new Date(item.updated_at).toISOString(),
      isDir: item.dir || item.file_type === 0
    }));
  }

  /**
   * 查找或创建文件夹
   */
  async findOrCreateFolder(folderPath: string): Promise<string> {
    const parts = folderPath.split('/').filter(p => p);
    let currentId = '0';

    for (const part of parts) {
      const files = await this.listFiles(currentId);
      const existing = files.find(f => f.fileName === part && f.isDir);
      
      if (existing) {
        currentId = existing.fid;
      } else {
        currentId = await this.createFolder(part, currentId);
      }
    }

    return currentId;
  }

  /**
   * 删除文件
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.request('/file/delete', 'POST', {
      action_type: 2,
      filelist: [fileId],
      exclude_fids: []
    });
  }

  /**
   * 预上传请求
   */
  async preUpload(fileName: string, fileSize: number, parentId: string): Promise<PreUploadResponse> {
    const now = Date.now();
    const response = await this.request<{
      data: {
        task_id: string;
        fid: string;
        finish: boolean;
        upload_id?: string;
        obj_key?: string;
        upload_url?: string;
        auth_info?: string;
        callback?: Record<string, unknown>;
        bucket?: string;
      };
      metadata?: { part_size?: number };
    }>('/file/upload/pre', 'POST', {
      ccp_hash_update: true,
      parallel_upload: true,
      pdir_fid: parentId,
      dir_name: '',
      size: fileSize,
      file_name: fileName,
      format_type: 'application/octet-stream',
      l_updated_at: now,
      l_created_at: now,
    });

    return {
      taskId: response.data.task_id,
      fid: response.data.fid,
      finish: response.data.finish || false,
      bucket: response.data.bucket || '',
      objKey: response.data.obj_key || '',
      uploadId: response.data.upload_id || '',
      uploadUrl: response.data.upload_url || '',
      authInfo: response.data.auth_info || '',
      callback: response.data.callback || {},
      partSize: response.metadata?.part_size || 4194304
    };
  }

  /**
   * 提交文件哈希（用于秒传检测）
   */
  async submitHash(taskId: string, md5: string, sha1: string): Promise<boolean> {
    const response = await this.request<{
      data: { finish: boolean };
    }>('/file/update/hash', 'POST', {
      task_id: taskId,
      md5,
      sha1,
    });

    return response.data?.finish || false;
  }

  /**
   * 获取分片上传授权
   */
  private async getUploadAuth(pre: PreUploadResponse, authMeta: string): Promise<string> {
    const response = await this.request<{
      data: { auth_key: string };
    }>('/file/upload/auth', 'POST', {
      auth_info: pre.authInfo,
      auth_meta: authMeta,
      task_id: pre.taskId
    });

    return response.data.auth_key;
  }

  /**
   * 上传单个分片到 OSS
   */
  private async uploadPartToOSS(pre: PreUploadResponse, partNumber: number, chunk: Buffer): Promise<string> {
    const now = new Date().toUTCString();
    const contentType = 'application/octet-stream';
    
    const authMeta = `PUT\n\n${contentType}\n${now}\nx-oss-date:${now}\nx-oss-user-agent:aliyun-sdk-js/1.0.0 Chrome 126.0.0.0 on Windows 10 64-bit\n/${pre.bucket}/${pre.objKey}?partNumber=${partNumber}&uploadId=${pre.uploadId}`;
    const authKey = await this.getUploadAuth(pre, authMeta);
    
    const uploadUrl = `https://${pre.bucket}.pds.quark.cn/${pre.objKey}?partNumber=${partNumber}&uploadId=${pre.uploadId}`;
    
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authKey,
        'Content-Type': contentType,
        'x-oss-date': now,
        'x-oss-user-agent': 'aliyun-sdk-js/1.0.0 Chrome 126.0.0.0 on Windows 10 64-bit'
      },
      body: chunk
    });

    if (!response.ok) {
      throw new Error(`分片${partNumber}上传失败: ${response.status}`);
    }

    return response.headers.get('ETag') || '';
  }

  /**
   * 提交上传完成（合并分片）
   */
  private async commitUploadToOSS(pre: PreUploadResponse, etags: string[]): Promise<void> {
    const now = new Date().toUTCString();
    
    const xmlParts = etags.map((etag, i) => 
      `<Part><PartNumber>${i + 1}</PartNumber><ETag>${etag}</ETag></Part>`
    ).join('');
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?><CompleteMultipartUpload>${xmlParts}</CompleteMultipartUpload>`;
    
    const contentMd5 = crypto.createHash('md5').update(xmlBody).digest('base64');
    const callbackB64 = Buffer.from(JSON.stringify(pre.callback)).toString('base64');
    
    const authMeta = `POST\n${contentMd5}\napplication/xml\n${now}\nx-oss-callback:${callbackB64}\nx-oss-date:${now}\nx-oss-user-agent:aliyun-sdk-js/1.0.0 Chrome 126.0.0.0 on Windows 10 64-bit\n/${pre.bucket}/${pre.objKey}?uploadId=${pre.uploadId}`;
    const authKey = await this.getUploadAuth(pre, authMeta);
    
    const uploadUrl = `https://${pre.bucket}.pds.quark.cn/${pre.objKey}?uploadId=${pre.uploadId}`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': authKey,
        'Content-MD5': contentMd5,
        'Content-Type': 'application/xml',
        'x-oss-callback': callbackB64,
        'x-oss-date': now,
        'x-oss-user-agent': 'aliyun-sdk-js/1.0.0 Chrome 126.0.0.0 on Windows 10 64-bit'
      },
      body: xmlBody
    });

    if (!response.ok) {
      throw new Error('提交上传失败');
    }
  }

  /**
   * 完成上传（通知夸克服务器）
   */
  private async finishUpload(pre: PreUploadResponse): Promise<void> {
    await this.request('/file/upload/finish', 'POST', {
      obj_key: pre.objKey,
      task_id: pre.taskId
    });
  }

  /**
   * 上传文件（支持分片上传和秒传）
   */
  async uploadFile(
    fileName: string,
    data: Buffer,
    parentId: string,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    onProgress?.(5);
    const md5 = crypto.createHash('md5').update(data).digest('hex');
    const sha1 = crypto.createHash('sha1').update(data).digest('hex');
    
    onProgress?.(10);
    const pre = await this.preUpload(fileName, data.length, parentId);
    
    const hashFinish = await this.submitHash(pre.taskId, md5, sha1);
    
    if (hashFinish) {
      onProgress?.(100);
      return pre.fid;
    }
    
    if (!pre.uploadId || !pre.objKey || !pre.bucket) {
      throw new Error('获取上传参数失败');
    }
    
    const etags: string[] = [];
    let offset = 0;
    let partNumber = 1;
    
    while (offset < data.length) {
      const chunk = data.subarray(offset, offset + pre.partSize);
      const etag = await this.uploadPartToOSS(pre, partNumber, chunk);
      etags.push(etag);
      
      offset += pre.partSize;
      partNumber++;
      
      onProgress?.(10 + Math.min(70, Math.floor(offset / data.length * 70)));
    }
    
    onProgress?.(85);
    await this.commitUploadToOSS(pre, etags);
    
    onProgress?.(95);
    await this.finishUpload(pre);
    
    onProgress?.(100);
    return pre.fid;
  }

  /**
   * 获取文件下载链接
   */
  async getDownloadUrl(fileId: string): Promise<string> {
    log('[QuarkAPI] 获取下载链接, fileId:', fileId);
    
    const response = await this.request<{
      data: Array<{ download_url: string; fid: string }>;
    }>('/file/download', 'POST', {
      fids: [fileId]
    });

    log('[QuarkAPI] 下载链接响应:', JSON.stringify(response).substring(0, 500));

    // 夸克返回的是数组格式
    const downloadData = response.data;
    if (!downloadData || !Array.isArray(downloadData) || downloadData.length === 0) {
      throw new Error('获取下载链接失败: 响应数据为空');
    }
    
    const downloadUrl = downloadData[0]?.download_url;
    if (!downloadUrl) {
      throw new Error('获取下载链接失败: 未找到下载地址');
    }

    log('[QuarkAPI] 下载链接:', downloadUrl.substring(0, 100) + '...');
    return downloadUrl;
  }

  /**
   * 下载文件
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    const downloadUrl = await this.getDownloadUrl(fileId);
    
    log('[QuarkAPI] 开始下载文件...');
    
    // 夸克下载链接需要带 Cookie 和正确的 headers
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Cookie': this.cookie,
        'Referer': 'https://pan.quark.cn/',
        'Origin': 'https://pan.quark.cn',
        'User-Agent': this.config.userAgent,
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'sec-ch-ua': '"Microsoft Edge";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
      }
    });

    log('[QuarkAPI] 下载响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      log('[QuarkAPI] 下载失败:', text.substring(0, 500));
      throw new Error(`下载文件失败: ${response.status} ${response.statusText} - ${text.substring(0, 200)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    log('[QuarkAPI] 下载完成, 大小:', arrayBuffer.byteLength);
    return Buffer.from(arrayBuffer);
  }
}
