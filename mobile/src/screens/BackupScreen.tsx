/**
 * 备份与恢复页面
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
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import {
  createBackup,
  shareBackup,
  listBackups,
  deleteBackup,
  restoreBackup,
  verifyBackup,
  exportToCSV,
} from '../services/backup';
import { useVaultStore } from '../stores/vaultStore';

interface Props {
  onBack: () => void;
}

interface BackupFile {
  name: string;
  path: string;
  size: number;
  createdAt: Date;
}

export default function BackupScreen({ onBack }: Props) {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const { refreshAll } = useVaultStore();

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    const list = await listBackups();
    setBackups(list);
  };

  const handleCreateBackup = async () => {
    setLoadingAction('create');
    try {
      const path = await createBackup();
      await loadBackups();
      
      Alert.alert('备份成功', '是否分享备份文件？', [
        { text: '稍后', style: 'cancel' },
        {
          text: '分享',
          onPress: () => shareBackup(path),
        },
      ]);
    } catch (error) {
      Alert.alert('错误', '创建备份失败');
      console.error(error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.json, DocumentPicker.types.allFiles],
      });

      const file = result[0];
      if (!file.uri) return;

      setLoadingAction('verify');

      // 验证备份
      const verification = await verifyBackup(file.uri.replace('file://', ''));
      
      if (!verification.valid) {
        Alert.alert('无效备份', verification.error || '无法读取备份文件');
        setLoadingAction(null);
        return;
      }

      setLoadingAction(null);

      // 选择恢复模式
      Alert.alert(
        '恢复备份',
        `备份时间: ${new Date(verification.info!.createdAt).toLocaleString()}\n` +
        `包含 ${verification.info!.entriesCount} 条密码\n\n` +
        '请选择恢复模式:',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '合并',
            onPress: () => doRestore(file.uri.replace('file://', ''), 'merge'),
          },
          {
            text: '覆盖',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                '确认覆盖',
                '覆盖将删除所有现有数据，确定继续？',
                [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '确定覆盖',
                    style: 'destructive',
                    onPress: () => doRestore(file.uri.replace('file://', ''), 'overwrite'),
                  },
                ]
              );
            },
          },
        ]
      );
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('错误', '选择文件失败');
        console.error(error);
      }
      setLoadingAction(null);
    }
  };

  const doRestore = async (path: string, mode: 'overwrite' | 'merge') => {
    setLoadingAction('restore');
    try {
      const result = await restoreBackup(path, mode);
      
      if (result.success) {
        await refreshAll();
        Alert.alert(
          '恢复成功',
          `已添加 ${result.added} 条密码` +
          (result.skipped ? `，跳过 ${result.skipped} 条重复` : '')
        );
      } else {
        Alert.alert('恢复失败', result.error);
      }
    } catch (error) {
      Alert.alert('错误', '恢复过程出错');
      console.error(error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleExportCSV = async () => {
    Alert.alert(
      '安全警告',
      'CSV 导出为明文格式，密码将不加密。仅用于迁移到其他密码管理器。\n\n确定继续？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '继续导出',
          style: 'destructive',
          onPress: async () => {
            setLoadingAction('export');
            try {
              const path = await exportToCSV();
              Alert.alert('导出成功', '是否分享 CSV 文件？', [
                { text: '稍后', style: 'cancel' },
                {
                  text: '分享',
                  onPress: () => shareBackup(path),
                },
              ]);
            } catch (error) {
              Alert.alert('错误', '导出失败');
              console.error(error);
            } finally {
              setLoadingAction(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteBackup = (backup: BackupFile) => {
    Alert.alert('删除备份', `确定删除 ${backup.name}？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteBackup(backup.path);
          await loadBackups();
        },
      },
    ]);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>备份与恢复</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* 操作按钮 */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCreateBackup}
            disabled={!!loadingAction}
          >
            {loadingAction === 'create' ? (
              <ActivityIndicator color="#3B82F6" />
            ) : (
              <>
                <Text style={styles.actionIcon}>💾</Text>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>创建备份</Text>
                  <Text style={styles.actionDesc}>加密备份所有数据</Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleImportBackup}
            disabled={!!loadingAction}
          >
            {loadingAction === 'verify' || loadingAction === 'restore' ? (
              <ActivityIndicator color="#3B82F6" />
            ) : (
              <>
                <Text style={styles.actionIcon}>📥</Text>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>恢复备份</Text>
                  <Text style={styles.actionDesc}>从备份文件恢复</Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonLast]}
            onPress={handleExportCSV}
            disabled={!!loadingAction}
          >
            {loadingAction === 'export' ? (
              <ActivityIndicator color="#3B82F6" />
            ) : (
              <>
                <Text style={styles.actionIcon}>📤</Text>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>导出 CSV</Text>
                  <Text style={styles.actionDesc}>明文导出（用于迁移）</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 备份列表 */}
        <Text style={styles.sectionTitle}>本地备份</Text>
        
        {backups.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>暂无本地备份</Text>
          </View>
        ) : (
          <View style={styles.backupList}>
            {backups.map((backup, index) => (
              <TouchableOpacity
                key={backup.path}
                style={[
                  styles.backupItem,
                  index === backups.length - 1 && styles.backupItemLast,
                ]}
                onLongPress={() => handleDeleteBackup(backup)}
              >
                <View style={styles.backupInfo}>
                  <Text style={styles.backupName} numberOfLines={1}>
                    {backup.name}
                  </Text>
                  <Text style={styles.backupMeta}>
                    {backup.createdAt.toLocaleString()} · {formatSize(backup.size)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => shareBackup(backup.path)}
                >
                  <Text style={styles.shareIcon}>📤</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.hint}>💡 长按备份可删除</Text>
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
  actionsCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    minHeight: 72,
  },
  actionButtonLast: {
    borderBottomWidth: 0,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  emptyCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  backupList: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
  },
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backupItemLast: {
    borderBottomWidth: 0,
  },
  backupInfo: {
    flex: 1,
  },
  backupName: {
    fontSize: 14,
    color: '#F9FAFB',
    marginBottom: 4,
  },
  backupMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  shareButton: {
    padding: 8,
  },
  shareIcon: {
    fontSize: 18,
  },
  hint: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
});
