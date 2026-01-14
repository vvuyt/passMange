/**
 * 夸克网盘 SDK 类型定义
 * 独立模块，方便跨平台复用和维护
 */

// API 配置
export interface QuarkConfig {
  apiBase: string;
  referer: string;
  origin: string;
  userAgent: string;
}

// 文件信息
export interface QuarkFile {
  fid: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  isDir: boolean;
}

// 预上传响应
export interface PreUploadResponse {
  taskId: string;
  fid: string;
  finish: boolean;
  bucket: string;
  objKey: string;
  uploadId: string;
  uploadUrl: string;
  authInfo: string;
  callback: Record<string, unknown>;
  partSize: number;
}

// 用户信息
export interface QuarkUserInfo {
  valid: boolean;
  nickname?: string;
}

// 上传进度回调
export type UploadProgressCallback = (percent: number) => void;

// API 响应基础结构
export interface QuarkApiResponse<T = unknown> {
  status?: number;
  code?: number | string;
  message?: string;
  data?: T;
  metadata?: Record<string, unknown>;
}

// 文件列表响应
export interface FileListResponse {
  list: Array<{
    fid: string;
    file_name: string;
    size: number;
    created_at: number;
    updated_at: number;
    file_type: number;
    dir: boolean;
  }>;
}

// 预上传响应原始数据
export interface PreUploadRawResponse {
  task_id: string;
  fid: string;
  finish: boolean;
  upload_id?: string;
  obj_key?: string;
  upload_url?: string;
  auth_info?: string;
  callback?: Record<string, unknown>;
  bucket?: string;
}

// 下载响应
export interface DownloadResponse {
  download_url: string;
  fid: string;
}
