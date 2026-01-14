/**
 * 分类筛选组件
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Category } from '../types/models';
import { useVaultStore } from '../stores/vaultStore';

export default function CategoryFilter() {
  const { categories, selectedCategoryId, setSelectedCategoryId, entries } = useVaultStore();

  // 计算每个分类的条目数量
  const getCategoryCount = (categoryId: string | null) => {
    if (!categoryId) return entries.length;
    return entries.filter((e) => e.categoryId === categoryId).length;
  };

  // 获取收藏数量
  const favoriteCount = entries.filter((e) => e.favorite).length;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* 全部 */}
      <TouchableOpacity
        style={[styles.chip, !selectedCategoryId && styles.chipActive]}
        onPress={() => setSelectedCategoryId(null)}
      >
        <Text style={[styles.chipText, !selectedCategoryId && styles.chipTextActive]}>
          全部 ({getCategoryCount(null)})
        </Text>
      </TouchableOpacity>

      {/* 收藏 */}
      {favoriteCount > 0 && (
        <TouchableOpacity
          style={[styles.chip, selectedCategoryId === 'favorites' && styles.chipActive]}
          onPress={() => setSelectedCategoryId('favorites')}
        >
          <Text style={[styles.chipText, selectedCategoryId === 'favorites' && styles.chipTextActive]}>
            ⭐ 收藏 ({favoriteCount})
          </Text>
        </TouchableOpacity>
      )}

      {/* 分类列表 */}
      {categories.map((category) => {
        const count = getCategoryCount(category.id);
        if (count === 0) return null;

        return (
          <TouchableOpacity
            key={category.id}
            style={[styles.chip, selectedCategoryId === category.id && styles.chipActive]}
            onPress={() => setSelectedCategoryId(category.id)}
          >
            <Text style={[styles.chipText, selectedCategoryId === category.id && styles.chipTextActive]}>
              {category.icon} {category.name} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 50,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#3B82F6',
  },
  chipText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#F9FAFB',
  },
});
