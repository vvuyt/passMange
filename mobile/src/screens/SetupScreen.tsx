/**
 * 初始设置界面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { setupVault } from '../services/vault';
import { calculateStrength } from '../utils/passwordGenerator';
import { useVaultStore } from '../stores/vaultStore';

interface Props {
  onComplete: () => void;
}

export default function SetupScreen({ onComplete }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setInitialized, setUnlocked } = useVaultStore();

  const strength = calculateStrength(password);

  const getStrengthColor = () => {
    const colors = ['#EF4444', '#F59E0B', '#EAB308', '#22C55E', '#10B981'];
    return colors[strength.score];
  };

  const handleSetup = async () => {
    if (password.length < 8) {
      setError('密码长度至少 8 位');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (strength.score < 2) {
      setError('密码强度太弱，请设置更复杂的密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await setupVault(password);
      setInitialized(true);
      setUnlocked(true);
      onComplete();
    } catch (err) {
      setError('设置失败，请重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>设置主密码</Text>
          <Text style={styles.subtitle}>
            主密码是访问密码库的唯一凭证{'\n'}请牢记，丢失后无法恢复
          </Text>

          <TextInput
            style={styles.input}
            placeholder="设置主密码"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${(strength.score + 1) * 20}%`,
                      backgroundColor: getStrengthColor(),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
                {strength.level}
              </Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="确认主密码"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSetup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>创建密码库</Text>
            )}
          </TouchableOpacity>

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>密码建议：</Text>
            {strength.feedback.map((tip, index) => (
              <Text key={index} style={styles.tipItem}>
                • {tip}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContent: {
    flexGrow: 1,
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
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
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
  strengthContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
    width: 40,
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
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tips: {
    width: '100%',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
  },
  tipsTitle: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  tipItem: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
  },
});
