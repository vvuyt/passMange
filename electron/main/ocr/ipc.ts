/**
 * OCR IPC Handlers
 * OCR IPC 处理器
 */

import { ipcMain } from 'electron';
import ocrEngine from './index';
import credentialParser from './parser';
import screenshotModule from '../screenshot';

// IPC 通道名称
export const IPC_CHANNELS = {
  OCR_INITIALIZE: 'ocr:initialize',
  OCR_RECOGNIZE: 'ocr:recognize',
  OCR_RECOGNIZE_CLIPBOARD: 'ocr:recognize-clipboard',
  OCR_RECOGNIZE_FILE: 'ocr:recognize-file',
  OCR_SET_LANGUAGE: 'ocr:set-language',
  OCR_GET_LANGUAGE: 'ocr:get-language',
  OCR_PARSE_CREDENTIALS: 'ocr:parse-credentials',
  OCR_IS_READY: 'ocr:is-ready',
  OCR_TERMINATE: 'ocr:terminate',
};

/**
 * 注册 OCR IPC 处理器
 */
export function registerOCRIPC(): void {
  // 初始化 OCR 引擎
  ipcMain.handle(IPC_CHANNELS.OCR_INITIALIZE, async () => {
    try {
      await ocrEngine.initialize();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 识别图片（base64）
  ipcMain.handle(IPC_CHANNELS.OCR_RECOGNIZE, async (_, imageData: string) => {
    try {
      const buffer = Buffer.from(imageData, 'base64');
      const result = await ocrEngine.recognize(buffer);
      return result;
    } catch (error) {
      return { success: false, error: String(error), text: '', blocks: [], confidence: 0 };
    }
  });

  // 识别剪贴板图片
  ipcMain.handle(IPC_CHANNELS.OCR_RECOGNIZE_CLIPBOARD, async () => {
    try {
      // 从剪贴板获取图片
      const captureResult = await screenshotModule.getFromClipboard();
      if (!captureResult.success || !captureResult.imageBuffer) {
        return { success: false, error: captureResult.error || '获取剪贴板图片失败', text: '', blocks: [], confidence: 0 };
      }

      // 识别图片
      const ocrResult = await ocrEngine.recognize(captureResult.imageBuffer);
      
      // 解析凭证
      if (ocrResult.success) {
        const credentials = credentialParser.parse(ocrResult);
        return { ...ocrResult, credentials };
      }
      
      return ocrResult;
    } catch (error) {
      return { success: false, error: String(error), text: '', blocks: [], confidence: 0 };
    }
  });

  // 识别文件图片
  ipcMain.handle(IPC_CHANNELS.OCR_RECOGNIZE_FILE, async (_, filePath: string) => {
    try {
      // 从文件加载图片
      const captureResult = await screenshotModule.loadFromFile(filePath);
      if (!captureResult.success || !captureResult.imageBuffer) {
        return { success: false, error: captureResult.error || '加载图片文件失败', text: '', blocks: [], confidence: 0 };
      }

      // 识别图片
      const ocrResult = await ocrEngine.recognize(captureResult.imageBuffer);
      
      // 解析凭证
      if (ocrResult.success) {
        const credentials = credentialParser.parse(ocrResult);
        return { ...ocrResult, credentials };
      }
      
      return ocrResult;
    } catch (error) {
      return { success: false, error: String(error), text: '', blocks: [], confidence: 0 };
    }
  });

  // 设置识别语言
  ipcMain.handle(IPC_CHANNELS.OCR_SET_LANGUAGE, async (_, lang: 'chi_sim' | 'eng' | 'chi_sim+eng') => {
    try {
      await ocrEngine.setLanguage(lang);
      return { success: true, language: lang };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 获取当前语言
  ipcMain.handle(IPC_CHANNELS.OCR_GET_LANGUAGE, async () => {
    try {
      const language = ocrEngine.getLanguage();
      return { success: true, language };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 解析凭证
  ipcMain.handle(IPC_CHANNELS.OCR_PARSE_CREDENTIALS, async (_, ocrResult: any) => {
    try {
      const credentials = credentialParser.parse(ocrResult);
      return { success: true, credentials };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 检查引擎是否就绪
  ipcMain.handle(IPC_CHANNELS.OCR_IS_READY, async () => {
    try {
      const isReady = ocrEngine.isReady();
      return { success: true, isReady };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 释放引擎资源
  ipcMain.handle(IPC_CHANNELS.OCR_TERMINATE, async () => {
    try {
      await ocrEngine.terminate();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  console.log('OCR IPC handlers registered');
}

/**
 * 注销 OCR IPC 处理器
 */
export function unregisterOCRIPC(): void {
  ipcMain.removeHandler(IPC_CHANNELS.OCR_INITIALIZE);
  ipcMain.removeHandler(IPC_CHANNELS.OCR_RECOGNIZE);
  ipcMain.removeHandler(IPC_CHANNELS.OCR_RECOGNIZE_CLIPBOARD);
  ipcMain.removeHandler(IPC_CHANNELS.OCR_RECOGNIZE_FILE);
  ipcMain.removeHandler(IPC_CHANNELS.OCR_SET_LANGUAGE);
  ipcMain.removeHandler(IPC_CHANNELS.OCR_GET_LANGUAGE);
  ipcMain.removeHandler(IPC_CHANNELS.OCR_PARSE_CREDENTIALS);
  ipcMain.removeHandler(IPC_CHANNELS.OCR_IS_READY);
  ipcMain.removeHandler(IPC_CHANNELS.OCR_TERMINATE);
}

export default {
  registerOCRIPC,
  unregisterOCRIPC,
  IPC_CHANNELS,
};
