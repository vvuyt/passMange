/**
 * 添加/编辑密码页面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { PasswordEntry, Category, PasswordConfig } from '../types/models';
import { useVaultStore } from '../stores/vaultStore';
import { createEntry, updateEntry } from '../services/vault';
import {
  generatePassword,
  calculateStrength,
  DEFAULT_PASSWORD_CONFIG,
} from '../utils/passwordGenerator';

interface Props {
  entry?: PasswordEntry; // 编辑模式时传入
  onSave: (entry: PasswordEntry) => void;
  onCancel: () => void;
}

export default function EntryFormScreen({ entry, onSave, onCancel }: Props) {
  const isEditing = !!entry;
  const { categories, addEntry, updateEntry: updateStoreEntry } = useVaultStore();

  const [title, setTitle] = useState(entry?.title || '');
  const [username, setUsername] = useState(entry?.username || '');
  const [password, setPassword] = useState(entry?.password || '');
  const [url, setUrl] = useState(entry?.url || '');
  const [notes, setNotes] = useState(entry?.notes || '');
  const [categoryId, setCategoryId] = useState(entry?.categoryId || '');
  const [favorite, setFavorite] = useState(entry?.favorite || false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // 密码生成器
  const [showGenerator, setShowGenerator] = useState(false);
  const [genConfig, setGenConfig] = useState<PasswordConfig>(DEFAULT_PASSWORD_CONFIG);

  const passwordStrength = calculateStrength(password);

  const getStrengthColor = () => {
    const colors = ['#EF4444', '#F59E0B', '#EAB308', '#22C55E', '#10B981'];
    return colors[passwordStrength.score];
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword(genConfig);
    setPassword(newPassword);
    setShowGenerator(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入标题');
      return;
    }
    if (!username.trim()) {
      Alert.alert('提示', '请输入用户名');
      return;
    }
    if (!password.trim()) {
      Alert.alert('提示', '请输入密码');
      return;
    }

    setSaving(true);

    try {
      if (isEditing && entry) {
        const updatedEntry: PasswordEntry = {
          ...entry,
          title: title.trim(),
          username: username.trim(),
          password,
          url: url.trim() || undefined,
          notes: notes.trim() || undefined,
          categoryId: categoryId || undefined,
          favorite,
          updatedAt: new Date().toISOString(),
        };
        await updateEntry(updatedEntry);
        updateStoreEntry(updatedEntry);
        onSave(updatedEntry);
      } else {
        const id = await createEntry({
          title: title.trim(),
          username: username.trim(),
          password,
          url: url.trim() || undefined,
          notes: notes.trim() || undefined,
          categoryId: categoryId || undefined,
          favorite,
          tags: [],
        });
        const newEntry: PasswordEntry = {
          id,
          title: title.trim(),
          username: username.trim(),
          password,
          url: url.trim() || undefined,
          notes: notes.trim() || undefined,
          categoryId: categoryId || undefined,
          favorite,
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addEntry(newEntry);
        onSave(newEntry);
      }
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? '编辑密码' : '添加密码'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.headerButton}
          disabled={saving}
        >
          <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
            {saving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* 标题 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>标题 *</Text>
          <TextInput
            style={styles.input}
            placeholder="例如：GitHub"
            placeholderTextColor="#6B7280"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* 用户名 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>用户名 *</Text>
          <TextInput
            style={styles.input}
            placeholder="用户名或邮箱"
            placeholderTextColor="#6B7280"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        {/* 密码 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>密码 *</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="密码"
              placeholderTextColor="#6B7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.passwordAction}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.actionIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.passwordAction}
              onPress={() => setShowGenerator(true)}
            >
              <Text style={styles.actionIcon}>🎲</Text>
            </TouchableOpacity>
          </View>
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${(passwordStrength.score + 1) * 20}%`,
                      backgroundColor: getStrengthColor(),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
                {passwordStrength.level}
              </Text>
            </View>
          )}
        </View>

        {/* 网址 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>网址</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com"
            placeholderTextColor="#6B7280"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        {/* 分类 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>分类</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                !categoryId && styles.categoryChipActive,
              ]}
              onPress={() => setCategoryId('')}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  !categoryId && styles.categoryChipTextActive,
                ]}
              >
                无
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  categoryId === cat.id && styles.categoryChipActive,
                ]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    categoryId === cat.id && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.icon} {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 备注 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>备注</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="添加备注..."
            placeholderTextColor="#6B7280"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* 收藏 */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>添加到收藏</Text>
          <Switch
            value={favorite}
            onValueChange={setFavorite}
            trackColor={{ false: '#374151', true: '#3B82F6' }}
            thumbColor="#F9FAFB"
          />
        </View>
      </ScrollView>

      {/* 密码生成器弹窗 */}
      <Modal
        visible={showGenerator}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenerator(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>密码生成器</Text>

            <View style={styles.genOption}>
              <Text style={styles.genLabel}>长度: {genConfig.length}</Text>
              <View style={styles.genLengthRow}>
                <TouchableOpacity
                  style={styles.genLengthBtn}
                  onPress={() =>
                    setGenConfig((c) => ({ ...c, length: Math.max(8, c.length - 1) }))
                  }
                >
                  <Text style={styles.genLengthBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.genLengthValue}>{genConfig.length}</Text>
                <TouchableOpacity
                  style={styles.genLengthBtn}
                  onPress={() =>
                    setGenConfig((c) => ({ ...c, length: Math.min(64, c.length + 1) }))
                  }
                >
                  <Text style={styles.genLengthBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.genOption}>
              <Text style={styles.genLabel}>大写字母 (A-Z)</Text>
              <Switch
                value={genConfig.uppercase}
                onValueChange={(v) => setGenConfig((c) => ({ ...c, uppercase: v }))}
                trackColor={{ false: '#374151', true: '#3B82F6' }}
              />
            </View>

            <View style={styles.genOption}>
              <Text style={styles.genLabel}>小写字母 (a-z)</Text>
              <Switch
                value={genConfig.lowercase}
                onValueChange={(v) => setGenConfig((c) => ({ ...c, lowercase: v }))}
                trackColor={{ false: '#374151', true: '#3B82F6' }}
              />
            </View>

            <View style={styles.genOption}>
              <Text style={styles.genLabel}>数字 (0-9)</Text>
              <Switch
                value={genConfig.numbers}
                onValueChange={(v) => setGenConfig((c) => ({ ...c, numbers: v }))}
                trackColor={{ false: '#374151', true: '#3B82F6' }}
              />
            </View>

            <View style={styles.genOption}>
              <Text style={styles.genLabel}>特殊字符 (!@#$...)</Text>
              <Switch
                value={genConfig.special}
                onValueChange={(v) => setGenConfig((c) => ({ ...c, special: v }))}
                trackColor={{ false: '#374151', true: '#3B82F6' }}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowGenerator(false)}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleGeneratePassword}
              >
                <Text style={styles.modalConfirmText}>生成</Text>
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
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  cancelText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  saveText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F9FAFB',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  passwordAction: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderLeftWidth: 1,
    borderLeftColor: '#374151',
  },
  actionIcon: {
    fontSize: 18,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
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
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
  },
  categoryChipText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  categoryChipTextActive: {
    color: '#F9FAFB',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#F9FAFB',
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
    marginBottom: 24,
    textAlign: 'center',
  },
  genOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  genLabel: {
    fontSize: 16,
    color: '#F9FAFB',
  },
  genLengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  genLengthBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genLengthBtnText: {
    fontSize: 20,
    color: '#F9FAFB',
  },
  genLengthValue: {
    fontSize: 18,
    color: '#F9FAFB',
    fontWeight: '600',
    width: 32,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
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
  modalConfirmText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
});
