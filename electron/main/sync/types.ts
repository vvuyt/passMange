/**
 * 夸克云盘同步模块类型定义
 */

// 夸克云盘API配置
export interface QuarkConfig {
  apiBase: string;
  referer: string;
  origin: string;
  userAgent: string;
}

// 夸克云盘文件信息
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

// 同步状态
export type SyncStatus = 'synced' | 'pending_upload' | 'not_connected';

// 同步配置
export interface SyncConfig {
  enabled: boolean;
  cloudFolderPath: string;
  cloudFolderId: string;
  checkOnStartup: boolean;
  remindOnExit: boolean;
}

// 同步信息
export interface SyncInfo {
  status: SyncStatus;
  lastSyncTime?: string;
  cloudFileId?: string;
  localVersion: number;
  isAuthenticated: boolean;
  nickname?: string;
}

// 认证状态
export interface SyncAuthState {
  isAuthenticated: boolean;
  nickname?: string;
  lastValidated?: string;
}

// 上传结果
export interface UploadResult {
  success: boolean;
  fileId?: string;
  error?: string;
}

// 下载结果
export interface DownloadResult {
  success: boolean;
  data?: Buffer;
  needsConfirm?: boolean;
  needsRestore?: boolean;
  error?: string;
}

// 恢复结果
export interface RestoreResult {
  success: boolean;
  error?: string;
}
