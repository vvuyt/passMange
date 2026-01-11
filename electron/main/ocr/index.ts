/**
 * OCR Engine Module
 * OCR引擎模块 - 使用 Tesseract.js 进行文字识别
 */

// Tesseract.js 将在安装依赖后导入
// import Tesseract from 'tesseract.js';

export interface TextBlock {
  text: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

export interface OCRResult {
  success: boolean;
  text: string;
  blocks: TextBlock[];
  confidence: number;
  error?: string;
}

// OCR 引擎状态
let isInitialized = false;
let currentLanguage = 'chi_sim+eng';

// Tesseract worker 实例
let worker: any = null;

/**
 * 初始化 OCR 引擎
 */
export async function initialize(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    // 动态导入 Tesseract.js
    const Tesseract = await import('tesseract.js');
    
    worker = await Tesseract.createWorker(currentLanguage, 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    isInitialized = true;
    console.log('OCR Engine initialized');
  } catch (error) {
    console.error('Failed to initialize OCR engine:', error);
    throw error;
  }
}

/**
 * 设置识别语言
 */
export async function setLanguage(lang: 'chi_sim' | 'eng' | 'chi_sim+eng'): Promise<void> {
  currentLanguage = lang;
  
  if (worker) {
    await worker.reinitialize(lang);
  }
}

/**
 * 识别图片中的文字
 */
export async function recognize(imageBuffer: Buffer): Promise<OCRResult> {
  if (!isInitialized || !worker) {
    try {
      await initialize();
    } catch (error) {
      return {
        success: false,
        text: '',
        blocks: [],
        confidence: 0,
        error: 'OCR 引擎初始化失败',
      };
    }
  }

  try {
    const result = await worker.recognize(imageBuffer);
    
    // 提取文本块信息
    const blocks: TextBlock[] = [];
    
    if (result.data.words) {
      for (const word of result.data.words) {
        blocks.push({
          text: word.text,
          bbox: {
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0,
          },
          confidence: word.confidence / 100,
        });
      }
    }

    const confidence = result.data.confidence / 100;

    // 检查识别质量
    if (confidence < 0.3) {
      return {
        success: true,
        text: result.data.text,
        blocks,
        confidence,
        error: '识别置信度较低，建议重新截图',
      };
    }

    return {
      success: true,
      text: result.data.text,
      blocks,
      confidence,
    };
  } catch (error) {
    return {
      success: false,
      text: '',
      blocks: [],
      confidence: 0,
      error: `OCR 识别失败: ${error}`,
    };
  }
}

/**
 * 释放 OCR 引擎资源
 */
export async function terminate(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
    isInitialized = false;
    console.log('OCR Engine terminated');
  }
}

/**
 * 检查引擎是否已初始化
 */
export function isReady(): boolean {
  return isInitialized;
}

/**
 * 获取当前语言设置
 */
export function getLanguage(): string {
  return currentLanguage;
}

export default {
  initialize,
  setLanguage,
  recognize,
  terminate,
  isReady,
  getLanguage,
};
