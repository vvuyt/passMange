/**
 * 主界面 - 密码列表
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useVaultStore } from '../stores/vaultStore';
import { PasswordEntry } from '../types/models';
import CategoryFilter from '../components/CategoryFilter';
import EntryListItem from '../components/EntryListItem';

interface Props {
  onEntryPress: (entry: PasswordEntry) => void;
  onAddPress: () => void;
  onSettingsPress?: () => void;
}

export default function HomeScreen({ onEntryPress, onAddPress, onSettingsPress }: Props) {
  const {
    entries,
    categories,
    searchQuery,
    setSearchQuery,
    selectedCategoryId,
    refreshAll,
  } = useVaultStore();
  const [refreshing, setRefreshing] = useState(false);

  // 筛选条目
  const filteredEntries = useMemo(() => {
    let result = entries;

    // 收藏筛选
    if (selectedCategoryId === 'favorites') {
      result = result.filter((e) => e.favorite);
    }
    // 按分类筛选
    else if (selectedCategoryId) {
      result = result.filter((e) => e.categoryId === selectedCategoryId);
    }

    // 按搜索词筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.username.toLowerCase().includes(query) ||
          e.url?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [entries, selectedCategoryId, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const getCategory = (categoryId?: string) => {
    if (!categoryId) return undefined;
    return categories.find((c) => c.id === categoryId);
  };

  const renderEntry = ({ item }: { item: PasswordEntry }) => (
    <EntryListItem
      entry={item}
      category={getCategory(item.categoryId)}
      searchQuery={searchQuery}
      onPress={() => onEntryPress(item)}
    />
  );

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>密码管理器</Text>
        {onSettingsPress && (
          <TouchableOpacity onPress={onSettingsPress} style={styles.settingsButton}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 搜索栏 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索密码..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* 分类筛选 */}
      <CategoryFilter />

      {/* 密码列表 */}
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔑</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? '没有找到匹配的密码' : '还没有保存任何密码'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.emptyButton} onPress={onAddPress}>
                <Text style={styles.emptyButtonText}>添加第一个密码</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* 添加按钮 */}
      <TouchableOpacity style={styles.fab} onPress={onAddPress}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 22,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    height: 44,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#F9FAFB',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
});
