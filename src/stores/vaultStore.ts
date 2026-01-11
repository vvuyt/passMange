/**
 * 密码库状态管理
 */

import { create } from 'zustand';
import { listEntries, listCategories, listTags } from '../utils/api';
import type { PasswordEntry, Category, Tag } from '../types/electron';

interface VaultState {
  // 状态
  isInitialized: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  error: string | null;

  // 数据
  entries: PasswordEntry[];
  categories: Category[];
  tags: Tag[];

  // 筛选
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  searchQuery: string;

  // Actions
  setInitialized: (value: boolean) => void;
  setUnlocked: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;

  setEntries: (entries: PasswordEntry[]) => void;
  setCategories: (categories: Category[]) => void;
  setTags: (tags: Tag[]) => void;

  setSelectedCategoryId: (id: string | null) => void;
  setSelectedTagId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;

  // 复合 Actions
  addEntry: (entry: PasswordEntry) => void;
  updateEntry: (entry: PasswordEntry) => void;
  removeEntry: (id: string) => void;

  // 刷新数据
  refreshEntries: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshTags: () => Promise<void>;
  refreshAll: () => Promise<void>;

  lock: () => void;  // 锁定时清理数据但保留初始化状态
  reset: () => void;
}

const initialState = {
  isInitialized: false,
  isUnlocked: false,
  isLoading: false,
  error: null,
  entries: [],
  categories: [],
  tags: [],
  selectedCategoryId: null,
  selectedTagId: null,
  searchQuery: '',
};

export const useVaultStore = create<VaultState>((set) => ({
  ...initialState,

  setInitialized: (value) => set({ isInitialized: value }),
  setUnlocked: (value) => set({ isUnlocked: value }),
  setLoading: (value) => set({ isLoading: value }),
  setError: (error) => set({ error }),

  setEntries: (entries) => set({ entries }),
  setCategories: (categories) => set({ categories }),
  setTags: (tags) => set({ tags }),

  setSelectedCategoryId: (id) => set({ selectedCategoryId: id, selectedTagId: null }),
  setSelectedTagId: (id) => set({ selectedTagId: id, selectedCategoryId: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  addEntry: (entry) => set((state) => ({ entries: [entry, ...state.entries] })),
  updateEntry: (entry) => set((state) => ({
    entries: state.entries.map((e) => (e.id === entry.id ? entry : e)),
  })),
  removeEntry: (id) => set((state) => ({
    entries: state.entries.filter((e) => e.id !== id),
  })),

  refreshEntries: async () => {
    try {
      const entries = await listEntries();
      set({ entries });
    } catch (error) {
      console.error('Failed to refresh entries:', error);
    }
  },

  refreshCategories: async () => {
    try {
      const categories = await listCategories();
      set({ categories });
    } catch (error) {
      console.error('Failed to refresh categories:', error);
    }
  },

  refreshTags: async () => {
    try {
      const tags = await listTags();
      set({ tags });
    } catch (error) {
      console.error('Failed to refresh tags:', error);
    }
  },

  refreshAll: async () => {
    try {
      const [entries, categories, tags] = await Promise.all([
        listEntries(),
        listCategories(),
        listTags(),
      ]);
      set({ entries, categories, tags });
    } catch (error) {
      console.error('Failed to refresh all:', error);
    }
  },

  lock: () => set((state) => ({
    isUnlocked: false,
    entries: [],
    categories: [],
    tags: [],
    selectedCategoryId: null,
    selectedTagId: null,
    searchQuery: '',
    error: null,
    // 保留 isInitialized
    isInitialized: state.isInitialized,
  })),

  reset: () => set(initialState),
}));
