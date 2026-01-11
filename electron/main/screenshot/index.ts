/**
 * Screenshot Capture Module
 * 截图捕获模块 - 管理屏幕截图和图片处理
 */

import { clipboard, desktopCapturer, screen } from 'electron';
import fs from 'fs';
import path from 'path';

export interface CaptureResult {
  success: boolean;
  imageBuffer?: Buffer;
  error?: string;
}

// 支持的图片格式魔数
const IMAGE_SIGNATURES = {
  PNG: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  JPG: Buffer.from([0xff, 0xd8, 0xff]),
  BMP: Buffer.from([0x42, 0x4d]),
};

/**
 * 验证图片格式
 */
export function validateImage(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  // 检查 PNG
  if (buffer.slice(0, 4).equals(IMAGE_SIGNATURES.PNG)) {
    return true;
  }

  // 检查 JPG
  if (buffer.slice(0, 3).equals(IMAGE_SIGNATURES.JPG)) {
    return true;
  }

  // 检查 BMP
  if (buffer.slice(0, 2).equals(IMAGE_SIGNATURES.BMP)) {
    return true;
  }

  return false;
}

/**
 * 获取图片格式
 */
export function getImageFormat(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  if (buffer.slice(0, 4).equals(IMAGE_SIGNATURES.PNG)) {
    return 'png';
  }

  if (buffer.slice(0, 3).equals(IMAGE_SIGNATURES.JPG)) {
    return 'jpg';
  }

  if (buffer.slice(0, 2).equals(IMAGE_SIGNATURES.BMP)) {
    return 'bmp';
  }

  return null;
}

/**
 * 从剪贴板获取图片
 */
export async function getFromClipboard(): Promise<CaptureResult> {
  try {
    const image = clipboard.readImage();

    if (image.isEmpty()) {
      return {
        success: false,
        error: '剪贴板中没有图片',
      };
    }

    const buffer = image.toPNG();

    if (!validateImage(buffer)) {
      return {
        success: false,
        error: '无效的图片格式',
      };
    }

    return {
      success: true,
      imageBuffer: buffer,
    };
  } catch (error) {
    return {
      success: false,
      error: `获取剪贴板图片失败: ${error}`,
    };
  }
}

/**
 * 从文件加载图片
 */
export async function loadFromFile(filePath: string): Promise<CaptureResult> {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: '文件不存在',
      };
    }

    // 检查文件扩展名
    const ext = path.extname(filePath).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.bmp'].includes(ext)) {
      return {
        success: false,
        error: '不支持的文件格式，请使用 PNG、JPG 或 BMP 格式',
      };
    }

    const buffer = fs.readFileSync(filePath);

    if (!validateImage(buffer)) {
      return {
        success: false,
        error: '无效的图片文件',
      };
    }

    return {
      success: true,
      imageBuffer: buffer,
    };
  } catch (error) {
    return {
      success: false,
      error: `加载图片文件失败: ${error}`,
    };
  }
}

/**
 * 捕获屏幕区域
 * 注意：Electron 的 desktopCapturer 主要用于视频捕获
 * 对于截图功能，可能需要使用原生模块或第三方库
 */
export async function captureRegion(): Promise<CaptureResult> {
  try {
    // 获取所有屏幕源
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
    });

    if (sources.length === 0) {
      return {
        success: false,
        error: '无法获取屏幕源',
      };
    }

    // 获取主屏幕的缩略图
    const primarySource = sources[0];
    const thumbnail = primarySource.thumbnail;

    if (thumbnail.isEmpty()) {
      return {
        success: false,
        error: '截图失败',
      };
    }

    const buffer = thumbnail.toPNG();

    return {
      success: true,
      imageBuffer: buffer,
    };
  } catch (error) {
    return {
      success: false,
      error: `截图失败: ${error}`,
    };
  }
}

/**
 * 捕获整个屏幕
 */
export async function captureFullScreen(): Promise<CaptureResult> {
  return captureRegion();
}

export default {
  validateImage,
  getImageFormat,
  getFromClipboard,
  loadFromFile,
  captureRegion,
  captureFullScreen,
};
