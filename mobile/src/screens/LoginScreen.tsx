/**
 * 登录界面 - 支持 TOTP 二次验证
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { unlockVault } from '../services/vault';
import { useVaultStore } from '../stores/vaultStore';
import {
  checkBiometricAvailability,
  authenticateWithBiometric,
  getBiometricTypeName,
  getBiometricTypeIcon,
  BiometricStatus,
} from '../services/biometrics';
import { setDerivedKey } from '../utils/crypto';
import { isTotpEnabled, verifyTotp, verifyRecoveryCode } from '../services/totp';

interface Props {
  onUnlock: () => void;
}

type LoginStep = 'password' | 'totp';

export default function LoginScreen({ onUnlock }: Props) {
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [step, setStep] = useState<LoginStep>('password');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const { setUnlocked, refreshAll } = useVaultStore();

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const status = await checkBiometricAvailability();
    setBiometricStatus(status);
    
    // 如果已启用生物识别，自动弹出验证
    if (status.enrolled) {
      handleBiometricUnlock();
    }
  };

  const handleBiometricUnlock = async () => {
    setLoading(true);
    setError('');

    try {
      const encryptedKey = await authenticateWithBiometric();
      if (encryptedKey) {
        // 恢复密钥
        const keyBuffer = Buffer.from(encryptedKey, 'base64');
        setDerivedKey(keyBuffer);
        
        // 检查是否需要 TOTP
        const totpEnabled = await isTotpEnabled();
        if (totpEnabled) {
          setStep('totp');
          setLoading(false);
          return;
        }
        
        setUnlocked(true);
        await refreshAll();
        onUnlock();
      }
    } catch (err) {
      console.error('Biometric unlock failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setError('请输入主密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await unlockVault(password);
      if (success) {
        // 检查是否需要 TOTP
        const totpEnabled = await isTotpEnabled();
        if (totpEnabled) {
          setStep('totp');
          setLoading(false);
          return;
        }
        
        setUnlocked(true);
        await refreshAll();
        onUnlock();
      } else {
        setError('密码错误');
      }
    } catch (err) {
      setError('解锁失败，请重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async () => {
    const code = totpCode.trim();
    if (!code) {
      setError(useRecoveryCode ? '请输入恢复码' : '请输入验证码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let valid = false;
      if (useRecoveryCode) {
        valid = await verifyRecoveryCode(code);
      } else {
        valid = await verifyTotp(code);
      }

      if (valid) {
        setUnlocked(true);
        await refreshAll();
        onUnlock();
      } else {
        setError(useRecoveryCode ? '恢复码无效' : '验证码错误');
        setTotpCode('');
      }
    } catch (err) {
      setError('验证失败，请重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPassword = () => {
    setStep('password');
    setTotpCode('');
    setError('');
    setUseRecoveryCode(false);
  };

  // TOTP 验证界面
  if (step === 'totp') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>二次验证</Text>
          <Text style={styles.subtitle}>
            {useRecoveryCode ? '请输入恢复码' : '请输入验证器 App 中的 6 位验证码'}
          </Text>

          <TextInput
            style={[styles.input, !useRecoveryCode && styles.codeInput]}
            placeholder={useRecoveryCode ? 'XXXX-XXXX' : '000000'}
            placeholderTextColor="#6B7280"
            value={totpCode}
            onChangeText={(text) => {
              if (useRecoveryCode) {
                setTotpCode(text.toUpperCase());
              } else {
                setTotpCode(text.replace(/\D/g, '').slice(0, 6));
              }
            }}
            onSubmitEditing={handleTotpSubmit}
            keyboardType={useRecoveryCode ? 'default' : 'number-pad'}
            maxLength={useRecoveryCode ? 9 : 6}
            autoFocus
            autoCapitalize="characters"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleTotpSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>验证</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              setUseRecoveryCode(!useRecoveryCode);
              setTotpCode('');
              setError('');
            }}
          >
            <Text style={styles.linkText}>
              {useRecoveryCode ? '使用验证码' : '使用恢复码'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={handleBackToPassword}>
            <Text style={styles.linkText}>← 返回</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // 密码输入界面
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>密码管理器</Text>
        <Text style={styles.subtitle}>请输入主密码解锁</Text>

        <TextInput
          style={styles.input}
          placeholder="主密码"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handlePasswordSubmit}
          autoFocus={!biometricStatus?.enrolled}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handlePasswordSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>解锁</Text>
          )}
        </TouchableOpacity>

        {/* 生物识别按钮 */}
        {biometricStatus?.enrolled && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricUnlock}
            disabled={loading}
          >
            <Text style={styles.biometricIcon}>
              {getBiometricTypeIcon(biometricStatus.biometryType)}
            </Text>
            <Text style={styles.biometricText}>
              使用 {getBiometricTypeName(biometricStatus.biometryType)} 解锁
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#F9FAFB',
    marginBottom: 16,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 8,
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  biometricText: {
    color: '#3B82F6',
    fontSize: 16,
  },
  linkButton: {
    marginTop: 16,
    padding: 8,
  },
  linkText: {
    color: '#3B82F6',
    fontSize: 14,
  },
});
