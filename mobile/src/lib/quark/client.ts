/**
 * 夸克网盘 API 客户端
 * 基于 Cookie 认证，实现文件上传、下载、管理功能
 * 
 * 这是逆向接口，如果夸克调整需要修改 config.ts 中的配置
 */

import { createHash } from 'react-native-quick-crypto';
import {
  QuarkConfig,
  QuarkFile,
  PreUploadResponse,
  QuarkUserInfo,
  QuarkApiResponse,
  FileListResponse,
  PreUploadRawResponse,
  DownloadResponse,
  UploadProgressCallback,
} from './types';
import {
  DEFAULT_CONFIG,
  ACCOUNT_INFO_URL,
  API_ENDPOINTS,
  COMMON_PARAMS,
  OSS_CONFIG,
} from './config';

export class QuarkClient {
  private cookie: string;
  private config: QuarkConfig;

  constructor(cookie: string, config: Partial<QuarkConfig> = {}) {
    this.cookie = cookie;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 更新 Cookie（用于刷新认证）
   */
  updateCookie(cookie: string): void {
    this.cookie = cookie;
  }

  /**
   * 更新配置（用于适配接口变化）
   */
  updateConfig(config: Partial<QuarkConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 发送 API 请求
   */
  private async request<T>(
    pathname: string,
    method: 'GET' | 'POST',
    data?: Record<string, unknown>,
    queryParams?: Record<string, string>
  ): Promise<QuarkApiResponse<T>> {
    const url = new URL(this.config.apiBase + pathname);
    
    // 添加通用参数
    url.searchParams.set(COMMON_PARAMS.pr, 'ucpro');
    url.searchParams.set(COMMON_PARAMS.fr, 'pc');
    
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
    
    let json: QuarkApiResponse<T>;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`响应解析失败: ${text.substring(0, 200)}`);
    }

    if (json.code !== undefined && json.code !== 0 && json.code !== 'OK') {
      throw new Error(json.message || `请求失败 (code: ${json.code})`);
    }

    return json;
  }

  /**
   * 验证 Cookie 有效性并获取用户信息
   */
  async validateCookie(): Promise<QuarkUserInfo> {
    try {
      const url = new URL(ACCOUNT_INFO_URL);
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
    const response = await this.request<{ fid: string }>(
      API_ENDPOINTS.createFolder,
      'POST',
      {
        pdir_fid: parentId,
        file_name: folderName,
        dir_path: '',
        dir_init_lock: false
      }
    );

    return response.data!.fid;
  }

  /**
   * 列出目录文件
   */
  async listFiles(folderId: string = '0'): Promise<QuarkFile[]> {
    const response = await this.request<FileListResponse>(
      API_ENDPOINTS.listFiles,
      'GET',
      undefined,
      {
        pdir_fid: folderId,
        _page: '1',
        _size: '50',
        _fetch_total: '1',
        _fetch_sub_dirs: '0',
        _sort: 'file_type:asc,updated_at:desc'
      }
    );

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
    await this.request(API_ENDPOINTS.deleteFile, 'POST', {
      action_type: 2,
      filelist: [fileId],
      exclude_fids: []
    });
  }

  /**
   * 预上传请求
   */
  private async preUpload(fileName: string, fileSize: number, parentId: string): Promise<PreUploadResponse> {
    const now = Date.now();
    const response = await this.request<PreUploadRawResponse>(
      API_ENDPOINTS.preUpload,
      'POST',
      {
        ccp_hash_update: true,
        parallel_upload: true,
        pdir_fid: parentId,
        dir_name: '',
        size: fileSize,
        file_name: fileName,
        format_type: 'application/octet-stream',
        l_updated_at: now,
        l_created_at: now,
      }
    );

    const data = response.data!;
    return {
      taskId: data.task_id,
      fid: data.fid,
      finish: data.finish || false,
      bucket: data.bucket || '',
      objKey: data.obj_key || '',
      uploadId: data.upload_id || '',
      uploadUrl: data.upload_url || '',
      authInfo: data.auth_info || '',
      callback: data.callback || {},
      partSize: (response.metadata?.part_size as number) || OSS_CONFIG.defaultPartSize
    };
  }

  /**
   * 提交文件哈希（用于秒传检测）
   */
  private async submitHash(taskId: string, md5: string, sha1: string): Promise<boolean> {
    const response = await this.request<{ finish: boolean }>(
      API_ENDPOINTS.updateHash,
      'POST',
      { task_id: taskId, md5, sha1 }
    );

    return response.data?.finish || false;
  }

  /**
   * 获取分片上传授权
   */
  private async getUploadAuth(pre: PreUploadResponse, authMeta: string): Promise<string> {
    const response = await this.request<{ auth_key: string }>(
      API_ENDPOINTS.uploadAuth,
      'POST',
      {
        auth_info: pre.authInfo,
        auth_meta: authMeta,
        task_id: pre.taskId
      }
    );

    return response.data!.auth_key;
  }

  /**
   * 上传单个分片到 OSS
   */
  private async uploadPartToOSS(pre: PreUploadResponse, partNumber: number, chunk: ArrayBuffer): Promise<string> {
    const now = new Date().toUTCString();
    const contentType = 'application/octet-stream';
    
    const authMeta = `PUT\n\n${contentType}\n${now}\nx-oss-date:${now}\nx-oss-user-agent:${OSS_CONFIG.ossUserAgent}\n/${pre.bucket}/${pre.objKey}?partNumber=${partNumber}&uploadId=${pre.uploadId}`;
    const authKey = await this.getUploadAuth(pre, authMeta);
    
    const uploadUrl = `https://${pre.bucket}${OSS_CONFIG.ossDomain}/${pre.objKey}?partNumber=${partNumber}&uploadId=${pre.uploadId}`;
    
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authKey,
        'Content-Type': contentType,
        'x-oss-date': now,
        'x-oss-user-agent': OSS_CONFIG.ossUserAgent
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
    
    const contentMd5 = createHash('md5').update(xmlBody).digest('base64');
    const callbackB64 = btoa(JSON.stringify(pre.callback));
    
    const authMeta = `POST\n${contentMd5}\napplication/xml\n${now}\nx-oss-callback:${callbackB64}\nx-oss-date:${now}\nx-oss-user-agent:${OSS_CONFIG.ossUserAgent}\n/${pre.bucket}/${pre.objKey}?uploadId=${pre.uploadId}`;
    const authKey = await this.getUploadAuth(pre, authMeta);
    
    const uploadUrl = `https://${pre.bucket}${OSS_CONFIG.ossDomain}/${pre.objKey}?uploadId=${pre.uploadId}`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': authKey,
        'Content-MD5': contentMd5,
        'Content-Type': 'application/xml',
        'x-oss-callback': callbackB64,
        'x-oss-date': now,
        'x-oss-user-agent': OSS_CONFIG.ossUserAgent
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
    await this.request(API_ENDPOINTS.uploadFinish, 'POST', {
      obj_key: pre.objKey,
      task_id: pre.taskId
    });
  }

  /**
   * 上传文件（支持分片上传和秒传）
   */
  async uploadFile(
    fileName: string,
    data: ArrayBuffer,
    parentId: string,
    onProgress?: UploadProgressCallback
  ): Promise<string> {
    onProgress?.(5);
    
    // 计算哈希
    const dataView = new Uint8Array(data);
    const md5 = createHash('md5').update(dataView).digest('hex');
    const sha1 = createHash('sha1').update(dataView).digest('hex');
    
    onProgress?.(10);
    const pre = await this.preUpload(fileName, data.byteLength, parentId);
    
    // 尝试秒传
    const hashFinish = await this.submitHash(pre.taskId, md5, sha1);
    
    if (hashFinish) {
      onProgress?.(100);
      return pre.fid;
    }
    
    if (!pre.uploadId || !pre.objKey || !pre.bucket) {
      throw new Error('获取上传参数失败');
    }
    
    // 分片上传
    const etags: string[] = [];
    let offset = 0;
    let partNumber = 1;
    
    while (offset < data.byteLength) {
      const chunk = data.slice(offset, offset + pre.partSize);
      const etag = await this.uploadPartToOSS(pre, partNumber, chunk);
      etags.push(etag);
      
      offset += pre.partSize;
      partNumber++;
      
      onProgress?.(10 + Math.min(70, Math.floor(offset / data.byteLength * 70)));
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
    const response = await this.request<DownloadResponse[]>(
      API_ENDPOINTS.download,
      'POST',
      { fids: [fileId] }
    );

    const downloadData = response.data;
    if (!downloadData || !Array.isArray(downloadData) || downloadData.length === 0) {
      throw new Error('获取下载链接失败: 响应数据为空');
    }
    
    const downloadUrl = downloadData[0]?.download_url;
    if (!downloadUrl) {
      throw new Error('获取下载链接失败: 未找到下载地址');
    }

    return downloadUrl;
  }

  /**
   * 下载文件
   */
  async downloadFile(fileId: string): Promise<ArrayBuffer> {
    const downloadUrl = await this.getDownloadUrl(fileId);
    
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Cookie': this.cookie,
        'Referer': this.config.referer,
        'Origin': this.config.origin,
        'User-Agent': this.config.userAgent,
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`下载文件失败: ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();
  }
}
