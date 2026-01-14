/**
 * 云同步页面
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
  Modal,
} from 'react-native';
import {
  getSyncStatus,
  bindWithCookie,
  unbind,
  uploadSync,
  downloadSync,
  restoreFromSync,
  SyncStatus,
} from '../services/sync';
import { useVaultStore } from '../stores/vaultStore';

interface Props {
  onBack: () => void;
}

export default function SyncScreen({ onBack }: Props) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [cookieInput, setCookieInput] = useState('');
  const { refreshAll } = useVaultStore();

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    const s = await getSyncStatus();
    setStatus(s);
    setLoading(false);
  };

  const handleBind = async () => {
    if (!cookieInput.trim()) {
      Alert.alert('提示', '请输入 Cookie');
      return;
    }

    setActionLoading('bind');
    const result = await bindWithCookie(cookieInput);
    setActionLoading(null);

    if (result.success) {
      setShowCookieModal(false);
      setCookieInput('');
      Alert.alert('绑定成功', `已绑定账号: ${result.nickname}`);
      await loadStatus();
    } else {
      Alert.alert('绑定失败', result.error);
    }
  };

  const handleUnbind = () => {
    Alert.alert('解绑确认', '确定要解绑夸克网盘吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '解绑',
        style: 'destructive',
        onPress: async () => {
          unbind();
          await loadStatus();
        },
      },
    ]);
  };

  const handleUpload = async () => {
    setActionLoading('upload');
    setProgress(0);
    
    const result = await uploadSync((p) => setProgress(p));
    setActionLoading(null);

    if (result.success) {
      Alert.alert('上传成功', '数据已同步到云端');
      await loadStatus();
    } else {
      Alert.alert('上传失败', result.error);
    }
  };

  const handleDownload = async () => {
    setActionLoading('download');
    
    const result = await downloadSync();
    
    if (!result.success) {
      setActionLoading(null);
      Alert.alert('下载失败', result.error);
      return;
    }

    Alert.alert(
      '下载成功',
      `云端数据包含 ${result.data!.data.entries.length} 条密码\n更新时间: ${new Date(result.data!.updatedAt).toLocaleString()}\n\n是否恢复到本地？`,
      [
        {
          text: '取消',
          style: 'cancel',
          onPress: () => setActionLoading(null),
        },
        {
          text: '恢复',
          onPress: async () => {
            const restoreResult = await restoreFromSync(result.data!);
            setActionLoading(null);
            
            if (restoreResult.success) {
              await refreshAll();
              Alert.alert('恢复成功', `已添加 ${restoreResult.added} 条新密码`);
              await loadStatus();
            } else {
              Alert.alert('恢复失败', restoreResult.error);
            }
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
          <Text style={styles.headerTitle}>云同步</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>云同步</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* 账号状态 */}
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Text style={styles.statusIconText}>
              {status?.isAuthenticated ? '☁️' : '🔗'}
            </Text>
          </View>
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              {status?.isAuthenticated ? '已绑定夸克网盘' : '未绑定'}
            </Text>
            {status?.isAuthenticated && (
              <Text style={styles.statusSubtitle}>{status.nickname}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.statusAction}
            onPress={status?.isAuthenticated ? handleUnbind : () => setShowCookieModal(true)}
          >
            <Text style={styles.statusActionText}>
              {status?.isAuthenticated ? '解绑' : '绑定'}
            </Text>
          </TouchableOpacity>
        </View>

        {status?.isAuthenticated && (
          <>
            {/* 同步信息 */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>上次同步</Text>
                <Text style={styles.infoValue}>
                  {status.lastSyncTime
                    ? new Date(status.lastSyncTime).toLocaleString()
                    : '从未同步'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>本地更改</Text>
                <Text style={[
                  styles.infoValue,
                  status.hasUnsyncedChanges && styles.infoValueWarning
                ]}>
                  {status.hasUnsyncedChanges ? '有未同步的更改' : '已同步'}
                </Text>
              </View>
            </View>

            {/* 同步操作 */}
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleUpload}
                disabled={!!actionLoading}
              >
                {actionLoading === 'upload' ? (
                  <View style={styles.progressContainer}>
                    <ActivityIndicator color="#3B82F6" />
                    <Text style={styles.progressText}>{progress}%</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.actionIcon}>⬆️</Text>
                    <View style={styles.actionContent}>
                      <Text style={styles.actionTitle}>上传到云端</Text>
                      <Text style={styles.actionDesc}>将本地数据同步到夸克网盘</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonLast]}
                onPress={handleDownload}
                disabled={!!actionLoading}
              >
                {actionLoading === 'download' ? (
                  <ActivityIndicator color="#3B82F6" />
                ) : (
                  <>
                    <Text style={styles.actionIcon}>⬇️</Text>
                    <View style={styles.actionContent}>
                      <Text style={styles.actionTitle}>从云端恢复</Text>
                      <Text style={styles.actionDesc}>下载云端数据到本地</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* 说明 */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>如何获取 Cookie？</Text>
          <Text style={styles.helpText}>
            1. 在电脑浏览器打开 pan.quark.cn 并登录{'\n'}
            2. 按 F12 打开开发者工具{'\n'}
            3. 切换到 Network（网络）标签{'\n'}
            4. 刷新页面，点击任意请求{'\n'}
            5. 在 Headers 中找到 Cookie，复制完整内容
          </Text>
        </View>
      </ScrollView>

      {/* Cookie 输入弹窗 */}
      <Modal
        visible={showCookieModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCookieModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>绑定夸克网盘</Text>
            <Text style={styles.modalDesc}>
              请粘贴从浏览器获取的 Cookie
            </Text>
            
            <TextInput
              style={styles.cookieInput}
              placeholder="粘贴 Cookie..."
              placeholderTextColor="#6B7280"
              value={cookieInput}
              onChangeText={setCookieInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowCookieModal(false);
                  setCookieInput('');
                }}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, actionLoading === 'bind' && styles.modalBtnDisabled]}
                onPress={handleBind}
                disabled={actionLoading === 'bind'}
              >
                {actionLoading === 'bind' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>绑定</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusIconText: {
    fontSize: 24,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  statusActionText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  infoValue: {
    color: '#F9FAFB',
    fontSize: 14,
  },
  infoValueWarning: {
    color: '#FBBF24',
  },
  actionsCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 16,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  progressText: {
    color: '#3B82F6',
    marginLeft: 12,
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  cookieInput: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#F9FAFB',
    height: 120,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalBtnDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
});
