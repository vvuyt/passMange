/**
 * 密码详情页面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { PasswordEntry } from '../types/models';
import { useVaultStore } from '../stores/vaultStore';
import { deleteEntry } from '../services/vault';

interface Props {
  entry: PasswordEntry;
  onEdit: () => void;
  onBack: () => void;
}

export default function EntryDetailScreen({ entry, onEdit, onBack }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const { removeEntry, categories } = useVaultStore();

  const category = categories.find((c) => c.id === entry.categoryId);

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('已复制', `${label}已复制到剪贴板`);
  };

  const handleDelete = () => {
    Alert.alert(
      '删除确认',
      `确定要删除「${entry.title}」吗？此操作不可恢复。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(entry.id);
              removeEntry(entry.id);
              onBack();
            } catch (error) {
              Alert.alert('错误', '删除失败，请重试');
            }
          },
        },
      ]
    );
  };

  const renderField = (
    label: string,
    value: string | undefined,
    options?: {
      isPassword?: boolean;
      copyable?: boolean;
    }
  ) => {
    if (!value) return null;

    const { isPassword, copyable = true } = options || {};
    const displayValue = isPassword && !showPassword ? '••••••••' : value;

    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.fieldValueRow}>
          <Text style={styles.fieldValue} selectable>
            {displayValue}
          </Text>
          <View style={styles.fieldActions}>
            {isPassword && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.actionIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            )}
            {copyable && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => copyToClipboard(value, label)}
              >
                <Text style={styles.actionIcon}>📋</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>密码详情</Text>
        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 标题卡片 */}
        <View style={styles.titleCard}>
          <View style={styles.titleIcon}>
            <Text style={styles.titleIconText}>
              {entry.icon || entry.title.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.titleContent}>
            <Text style={styles.title}>{entry.title}</Text>
            {category && (
              <Text style={styles.category}>
                {category.icon} {category.name}
              </Text>
            )}
          </View>
          {entry.favorite && <Text style={styles.favoriteIcon}>⭐</Text>}
        </View>

        {/* 字段列表 */}
        <View style={styles.fieldsCard}>
          {renderField('用户名', entry.username)}
          {renderField('密码', entry.password, { isPassword: true })}
          {renderField('网址', entry.url)}
          {renderField('备注', entry.notes, { copyable: false })}
        </View>

        {/* 元信息 */}
        <View style={styles.metaCard}>
          <Text style={styles.metaText}>
            创建于 {new Date(entry.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.metaText}>
            更新于 {new Date(entry.updatedAt).toLocaleDateString()}
          </Text>
        </View>

        {/* 删除按钮 */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>删除此密码</Text>
        </TouchableOpacity>
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
  editButton: {
    padding: 8,
  },
  editIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  titleIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleIconText: {
    fontSize: 24,
    color: '#F9FAFB',
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  favoriteIcon: {
    fontSize: 20,
  },
  fieldsCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  field: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  fieldLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  fieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldValue: {
    flex: 1,
    fontSize: 16,
    color: '#F9FAFB',
  },
  fieldActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  actionIcon: {
    fontSize: 18,
  },
  metaCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  deleteButton: {
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  deleteButtonText: {
    color: '#FCA5A5',
    fontSize: 16,
    fontWeight: '600',
  },
});
