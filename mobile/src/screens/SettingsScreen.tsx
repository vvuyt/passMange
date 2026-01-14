/**
 * 设置页面
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { useVaultStore } from '../stores/vaultStore';
import { lockVault } from '../services/vault';
import {
  checkBiometricAvailability,
  enableBiometric,
  disableBiometric,
  getBiometricTypeName,
  getBiometricTypeIcon,
  BiometricStatus,
} from '../services/biometrics';
import { getDerivedKey } from '../utils/crypto';

interface Props {
  onBack: () => void;
  onChangePassword?: () => void;
  onAutoLockSettings?: () => void;
  onBackup?: () => void;
  onSync?: () => void;
  onTotpSetup?: () => void;
}

export default function SettingsScreen({ onBack, onChangePassword, onAutoLockSettings, onBackup, onSync, onTotpSetup }: Props) {
  const { lock, entries, categories } = useVaultStore();
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    loadBiometricStatus();
  }, []);

  const loadBiometricStatus = async () => {
    const status = await checkBiometricAvailability();
    setBiometricStatus(status);
    setBiometricEnabled(status.enrolled);
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      // 启用生物识别
      try {
        const key = getDerivedKey();
        const success = await enableBiometric(key.toString('base64'));
        if (success) {
          setBiometricEnabled(true);
          Alert.alert('成功', '生物识别解锁已启用');
        } else {
          Alert.alert('取消', '生物识别设置已取消');
        }
      } catch (error) {
        Alert.alert('错误', '启用生物识别失败');
      }
    } else {
      // 禁用生物识别
      Alert.alert(
        '确认',
        '确定要禁用生物识别解锁吗？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '禁用',
            style: 'destructive',
            onPress: async () => {
              const success = await disableBiometric();
              if (success) {
                setBiometricEnabled(false);
              }
            },
          },
        ]
      );
    }
  };

  const handleLock = () => {
    lockVault();
    lock();
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const renderRow = (
    icon: string,
    label: string,
    right?: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
      {right}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设置</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* 安全设置 */}
        {renderSection('安全', (
          <>
            {biometricStatus?.available && (
              renderRow(
                getBiometricTypeIcon(biometricStatus.biometryType),
                `${getBiometricTypeName(biometricStatus.biometryType)} 解锁`,
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: '#374151', true: '#3B82F6' }}
                  thumbColor="#F9FAFB"
                />
              )
            )}
            {renderRow('🔢', '二次验证 (TOTP)', <Text style={styles.rowArrow}>›</Text>, onTotpSetup)}
            {renderRow('⏱️', '自动锁定', <Text style={styles.rowArrow}>›</Text>, onAutoLockSettings)}
            {renderRow('🔒', '立即锁定', undefined, handleLock)}
            {renderRow('🔑', '修改主密码', <Text style={styles.rowArrow}>›</Text>, onChangePassword)}
          </>
        ))}

        {/* 数据统计 */}
        {renderSection('数据', (
          <>
            {renderRow('📊', '密码数量', <Text style={styles.rowValue}>{entries.length}</Text>)}
            {renderRow('📁', '分类数量', <Text style={styles.rowValue}>{categories.length}</Text>)}
            {renderRow('☁️', '云同步', <Text style={styles.rowArrow}>›</Text>, onSync)}
            {renderRow('💾', '备份与恢复', <Text style={styles.rowArrow}>›</Text>, onBackup)}
          </>
        ))}

        {/* 关于 */}
        {renderSection('关于', (
          <>
            {renderRow('📱', '版本', <Text style={styles.rowValue}>0.1.0</Text>)}
            {renderRow('📄', '隐私政策', <Text style={styles.rowArrow}>›</Text>)}
            {renderRow('📋', '使用条款', <Text style={styles.rowArrow}>›</Text>)}
          </>
        ))}

        {/* 危险操作 */}
        {renderSection('危险区域', (
          <TouchableOpacity style={styles.dangerRow}>
            <Text style={styles.dangerIcon}>⚠️</Text>
            <Text style={styles.dangerLabel}>重置密码库</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
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
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  rowIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    color: '#F9FAFB',
  },
  rowValue: {
    fontSize: 16,
    color: '#6B7280',
  },
  rowArrow: {
    fontSize: 20,
    color: '#6B7280',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dangerIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  dangerLabel: {
    fontSize: 16,
    color: '#EF4444',
  },
});
