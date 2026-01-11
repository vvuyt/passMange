/**
 * 选择状态管理
 * 用于密码列表的多选功能
 */

import { create } from 'zustand';

interface SelectionState {
  // 是否处于选择模式
  isSelectionMode: boolean;
  // 选中的条目ID集合
  selectedIds: Set<string>;
  // 最后选中的ID（用于范围选择）
  lastSelectedId: string | null;
  
  // Actions
  toggleSelectionMode: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  rangeSelect: (ids: string[], startId: string, endId: string) => void;
  setSelectedIds: (ids: string[]) => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  isSelectionMode: false,
  selectedIds: new Set(),
  lastSelectedId: null,

  toggleSelectionMode: () => {
    const { isSelectionMode } = get();
    if (isSelectionMode) {
      // 退出选择模式时清空选择
      set({ isSelectionMode: false, selectedIds: new Set(), lastSelectedId: null });
    } else {
      set({ isSelectionMode: true });
    }
  },

  enterSelectionMode: () => {
    set({ isSelectionMode: true });
  },

  exitSelectionMode: () => {
    set({ isSelectionMode: false, selectedIds: new Set(), lastSelectedId: null });
  },

  toggleSelection: (id: string) => {
    const { selectedIds } = get();
    const newSelectedIds = new Set(selectedIds);
    
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    
    set({ selectedIds: newSelectedIds, lastSelectedId: id });
  },

  selectAll: (ids: string[]) => {
    set({ selectedIds: new Set(ids), lastSelectedId: ids[ids.length - 1] || null });
  },

  clearSelection: () => {
    set({ selectedIds: new Set(), lastSelectedId: null });
  },

  rangeSelect: (ids: string[], startId: string, endId: string) => {
    const startIndex = ids.indexOf(startId);
    const endIndex = ids.indexOf(endId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    
    const rangeIds = ids.slice(minIndex, maxIndex + 1);
    const { selectedIds } = get();
    const newSelectedIds = new Set(selectedIds);
    
    rangeIds.forEach(id => newSelectedIds.add(id));
    
    set({ selectedIds: newSelectedIds, lastSelectedId: endId });
  },

  setSelectedIds: (ids: string[]) => {
    set({ selectedIds: new Set(ids), lastSelectedId: ids[ids.length - 1] || null });
  },
}));
