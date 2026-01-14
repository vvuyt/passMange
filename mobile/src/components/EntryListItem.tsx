/**
 * 密码条目列表项组件
 * 支持滑动操作、快速复制
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { PasswordEntry, Category } from '../types/models';
import { toggleFavorite } from '../services/vault';
import { useVaultStore } from '../stores/vaultStore';

interface Props {
  entry: PasswordEntry;
  category?: Category;
  searchQuery?: string;
  onPress: () => void;
}

export default function EntryListItem({ entry, category, searchQuery, onPress }: Props) {
  const { updateEntry } = useVaultStore();
  const [showActions, setShowActions] = useState(false);

  const copyUsername = () => {
    Clipboard.setString(entry.username);
    Alert.alert('已复制', '用户名已复制到剪贴板');
  };

  const copyPassword = () => {
    Clipboard.setString(entry.password);
    Alert.alert('已复制', '密码已复制到剪贴板，30秒后自动清除');
    // 30秒后清除剪贴板
    setTimeout(() => {
      Clipboard.setString('');
    }, 30000);
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(entry.id, !entry.favorite);
      updateEntry({ ...entry, favorite: !entry.favorite });
    } catch (error) {
      console.error('Toggle favorite failed:', error);
    }
  };

  // 高亮搜索词
  const highlightText = (text: string) => {
    if (!searchQuery || !searchQuery.trim()) {
      return <Text style={styles.entryTitle}>{text}</Text>;
    }

    const query = searchQuery.toLowerCase();
    const index = text.toLowerCase().indexOf(query);

    if (index === -1) {
      return <Text style={styles.entryTitle}>{text}</Text>;
    }

    return (
      <Text style={styles.entryTitle}>
        {text.substring(0, index)}
        <Text style={styles.highlight}>
          {text.substring(index, index + query.length)}
        </Text>
        {text.substring(index + query.length)}
      </Text>
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={() => setShowActions(!showActions)}
      activeOpacity={0.7}
    >
      <View style={styles.entryCard}>
        {/* 图标 */}
        <View style={styles.entryIcon}>
          <Text style={styles.entryIconText}>
            {entry.icon || entry.title.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* 内容 */}
        <View style={styles.entryContent}>
          {highlightText(entry.title)}
          <Text style={styles.entryUsername} numberOfLines={1}>
            {entry.username}
          </Text>
          {category && (
            <Text style={styles.entryCategory}>
              {category.icon} {category.name}
            </Text>
          )}
        </View>

        {/* 收藏按钮 */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleToggleFavorite}
        >
          <Text style={styles.favoriteIcon}>{entry.favorite ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      </View>

      {/* 快捷操作 */}
      {showActions && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={copyUsername}>
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionText}>复制用户名</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={copyPassword}>
            <Text style={styles.actionIcon}>🔑</Text>
            <Text style={styles.actionText}>复制密码</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
  },
  entryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryIconText: {
    fontSize: 20,
    color: '#F9FAFB',
  },
  entryContent: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  highlight: {
    backgroundColor: '#FBBF24',
    color: '#111827',
  },
  entryUsername: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  entryCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  favoriteButton: {
    padding: 8,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -8,
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  actionText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
});
