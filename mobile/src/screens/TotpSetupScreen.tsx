/**
 * TOTP 二次验证设置页面
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  initTotpSetup,
  enableTotp,
  disableTotp,
  isTotpEnabled,
  verifyTotpCode,
  getRemainingRecoveryCodesCount,
} from '../services/totp';

interface Props {
  onBack: () => void;
}

type Step = 'status' | 'qrcode' | 'verify' | 'recovery';

export default function TotpSetupScreen({ onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<Step>('status');
  const [setupData, setSetupData] = useState<{
    secret: string;
    uri: string;
    recoveryCodes: string[];
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [remainingCodes, setRemainingCodes] = useState(0);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    const isEnabled = await isTotpEnabled();
    setEnabled(isEnabled);
    if (isEnabled) {
      const count = await getRemainingRecoveryCodesCount();
      setRemainingCodes(count);
    }
    setLoading(false);
  };

  const handleStartSetup = () => {
    const data = initTotpSetup();
    setSetupData(data);
    setStep('qrcode');
  };

  const handleVerify = async () => {
    if (!setupData || verifyCode.length !== 6) {
      Alert.alert('提示', '请输入 6 位验证码');
      return;
    }

    setVerifying(true);
    const valid = verifyTotpCode(setupData.secret, verifyCode);
    setVerifying(false);

    if (valid) {
      setStep('recovery');
    } else {
      Alert.alert('验证失败', '验证码错误，请重试');
      setVerifyCode('');
    }
  };

  const handleEnable = async () => {
    if (!setupData) return;

    try {
      await enableTotp(setupData.secret, setupData.recoveryCodes);
      Alert.alert('设置成功', '二次验证已启用');
      setEnabled(true);
      setStep('status');
      setSetupData(null);
      setVerifyCode('');
      await loadStatus();
    } catch (error) {
      Alert.alert('错误', '启用失败，请重试');
    }
  };

  const handleDisable = () => {
    Alert.alert(
      '禁用二次验证',
      '确定要禁用二次验证吗？这会降低账户安全性。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '禁用',
          style: 'destructive',
          onPress: async () => {
            await disableTotp();
            setEnabled(false);
            await loadStatus();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>二次验证</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  // 状态页面
  if (step === 'status') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>二次验证</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.statusCard}>
            <View style={styles.statusIcon}>
              <Text style={styles.statusIconText}>{enabled ? '🔐' : '🔓'}</Text>
            </View>
            <Text style={styles.statusTitle}>
              {enabled ? '二次验证已启用' : '二次验证未启用'}
            </Text>
            <Text style={styles.statusDesc}>
              {enabled
                ? '每次解锁密码库时需要输入验证码'
                : '启用后可增强账户安全性'}
            </Text>
          </View>

          {enabled && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>剩余恢复码</Text>
              <Text style={[
                styles.infoValue,
                remainingCodes < 3 && styles.infoValueWarning
              ]}>
                {remainingCodes} 个
              </Text>
              {remainingCodes < 3 && (
                <Text style={styles.infoWarning}>
                  ⚠️ 恢复码不足，建议重新设置
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.actionButton, enabled && styles.actionButtonDanger]}
            onPress={enabled ? handleDisable : handleStartSetup}
          >
            <Text style={[styles.actionButtonText, enabled && styles.actionButtonTextDanger]}>
              {enabled ? '禁用二次验证' : '启用二次验证'}
            </Text>
          </TouchableOpacity>

          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>什么是二次验证？</Text>
            <Text style={styles.helpText}>
              二次验证（TOTP）是一种额外的安全措施。启用后，每次解锁密码库除了需要主密码，还需要输入验证器 App 生成的 6 位动态验证码。
              {'\n\n'}
              推荐使用的验证器 App：
              {'\n'}• Google Authenticator
              {'\n'}• Microsoft Authenticator
              {'\n'}• Authy
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // 扫码页面
  if (step === 'qrcode' && setupData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('status')} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>扫描二维码</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.centerContent}>
          <Text style={styles.stepTitle}>第 1 步：扫描二维码</Text>
          <Text style={styles.stepDesc}>
            使用验证器 App 扫描下方二维码
          </Text>

          <View style={styles.qrContainer}>
            <QRCode value={setupData.uri} size={200} backgroundColor="#fff" />
          </View>

          <Text style={styles.secretLabel}>或手动输入密钥：</Text>
          <Text style={styles.secretValue} selectable>
            {setupData.secret}
          </Text>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => setStep('verify')}
          >
            <Text style={styles.nextButtonText}>下一步</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // 验证页面
  if (step === 'verify' && setupData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('qrcode')} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>验证设置</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.centerContent}>
          <Text style={styles.stepTitle}>第 2 步：输入验证码</Text>
          <Text style={styles.stepDesc}>
            输入验证器 App 显示的 6 位验证码
          </Text>

          <TextInput
            style={styles.codeInput}
            value={verifyCode}
            onChangeText={(text) => setVerifyCode(text.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor="#6B7280"
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />

          <TouchableOpacity
            style={[styles.nextButton, verifying && styles.nextButtonDisabled]}
            onPress={handleVerify}
            disabled={verifying}
          >
            {verifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextButtonText}>验证</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // 恢复码页面
  if (step === 'recovery' && setupData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('verify')} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>保存恢复码</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.stepTitle}>第 3 步：保存恢复码</Text>
          <Text style={styles.stepDesc}>
            请将以下恢复码保存在安全的地方。如果丢失验证器，可以使用恢复码解锁。
          </Text>

          <View style={styles.codesCard}>
            {setupData.recoveryCodes.map((code, index) => (
              <Text key={index} style={styles.codeItem} selectable>
                {code}
              </Text>
            ))}
          </View>

          <Text style={styles.warning}>
            ⚠️ 每个恢复码只能使用一次，使用后会自动失效
          </Text>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleEnable}
          >
            <Text style={styles.nextButtonText}>完成设置</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#F9FAFB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIconText: {
    fontSize: 32,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  statusDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  infoValueWarning: {
    color: '#FBBF24',
  },
  infoWarning: {
    fontSize: 13,
    color: '#FBBF24',
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  actionButtonDanger: {
    backgroundColor: '#7F1D1D',
  },
  actionButtonText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonTextDanger: {
    color: '#FCA5A5',
  },
  helpCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  secretLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  secretValue: {
    fontSize: 14,
    color: '#F9FAFB',
    fontFamily: 'monospace',
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  codeInput: {
    width: 200,
    height: 60,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    fontSize: 32,
    fontWeight: '600',
    color: '#F9FAFB',
    letterSpacing: 8,
    marginBottom: 24,
  },
  nextButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  codesCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  codeItem: {
    width: '48%',
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#F9FAFB',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    marginBottom: 8,
  },
  warning: {
    fontSize: 13,
    color: '#FBBF24',
    textAlign: 'center',
    marginBottom: 24,
  },
});
