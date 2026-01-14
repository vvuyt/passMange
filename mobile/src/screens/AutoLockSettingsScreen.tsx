/**
 * 自动锁定设置页面
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { getAutoLockTimeout, setAutoLockTimeout } from '../hooks/useAutoLock';

interface Props {
  onBack: () => void;
}

const TIMEOUT_OPTIONS = [
  { value: 0, label: '从不' },
  { value: 1, label: '1 分钟' },
  { value: 5, label: '5 分钟' },
  { value: 10, label: '10 分钟' },
  { value: 15, label: '15 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 60, label: '1 小时' },
];

export default function AutoLockSettingsScreen({ onBack }: Props) {
  const [selectedTimeout, setSelectedTimeout] = useState(5);

  useEffect(() => {
    setSelectedTimeout(getAutoLockTimeout());
  }, []);

  const handleSelect = (value: number) => {
    setSelectedTimeout(value);
    setAutoLockTimeout(value);
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>自动锁定</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.description}>
          设置应用在后台或空闲多长时间后自动锁定密码库
        </Text>

        <View style={styles.optionsList}>
          {TIMEOUT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.optionItem}
              onPress={() => handleSelect(option.value)}
            >
              <Text style={styles.optionLabel}>{option.label}</Text>
              {selectedTimeout === option.value && (
                <Text style={styles.checkIcon}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.note}>
          💡 建议设置 5-15 分钟，在安全性和便利性之间取得平衡
        </Text>
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
    padding: 16,
  },
  description: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  optionsList: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  optionLabel: {
    fontSize: 16,
    color: '#F9FAFB',
  },
  checkIcon: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: '600',
  },
  note: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 16,
    lineHeight: 20,
  },
});
