/**
 * 生物识别服务
 * 支持 Face ID / Touch ID / 指纹解锁
 */

import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import * as Keychain from 'react-native-keychain';

const rnBiometrics = new ReactNativeBiometrics();

const KEYCHAIN_SERVICE = 'password-manager-biometric';

export interface BiometricStatus {
  available: boolean;
  biometryType: 'FaceID' | 'TouchID' | 'Fingerprint' | 'None';
  enrolled: boolean;
}

/**
 * 检查生物识别是否可用
 */
export async function checkBiometricAvailability(): Promise<BiometricStatus> {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();

    let type: BiometricStatus['biometryType'] = 'None';
    if (biometryType === BiometryTypes.FaceID) {
      type = 'FaceID';
    } else if (biometryType === BiometryTypes.TouchID) {
      type = 'TouchID';
    } else if (biometryType === BiometryTypes.Biometrics) {
      type = 'Fingerprint';
    }

    // 检查是否已设置生物识别
    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
    });

    return {
      available,
      biometryType: type,
      enrolled: !!credentials,
    };
  } catch (error) {
    console.error('Biometric check failed:', error);
    return {
      available: false,
      biometryType: 'None',
      enrolled: false,
    };
  }
}

/**
 * 启用生物识别解锁
 * @param encryptedKey 加密后的密钥（用于存储）
 */
export async function enableBiometric(encryptedKey: string): Promise<boolean> {
  try {
    // 先验证生物识别
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: '验证身份以启用生物识别解锁',
      cancelButtonText: '取消',
    });

    if (!success) {
      return false;
    }

    // 存储加密密钥到 Keychain
    await Keychain.setGenericPassword('biometric', encryptedKey, {
      service: KEYCHAIN_SERVICE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
      accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    });

    return true;
  } catch (error) {
    console.error('Enable biometric failed:', error);
    return false;
  }
}

/**
 * 禁用生物识别解锁
 */
export async function disableBiometric(): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    return true;
  } catch (error) {
    console.error('Disable biometric failed:', error);
    return false;
  }
}

/**
 * 使用生物识别解锁
 * @returns 存储的加密密钥，或 null（如果验证失败）
 */
export async function authenticateWithBiometric(): Promise<string | null> {
  try {
    // 验证生物识别
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: '验证身份以解锁密码库',
      cancelButtonText: '使用密码',
    });

    if (!success) {
      return null;
    }

    // 从 Keychain 获取加密密钥
    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
    });

    if (credentials) {
      return credentials.password;
    }

    return null;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    return null;
  }
}

/**
 * 获取生物识别类型的显示名称
 */
export function getBiometricTypeName(type: BiometricStatus['biometryType']): string {
  switch (type) {
    case 'FaceID':
      return 'Face ID';
    case 'TouchID':
      return 'Touch ID';
    case 'Fingerprint':
      return '指纹识别';
    default:
      return '生物识别';
  }
}

/**
 * 获取生物识别类型的图标
 */
export function getBiometricTypeIcon(type: BiometricStatus['biometryType']): string {
  switch (type) {
    case 'FaceID':
      return '😊';
    case 'TouchID':
    case 'Fingerprint':
      return '👆';
    default:
      return '🔐';
  }
}
