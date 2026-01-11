import { useState, useRef, useEffect } from 'react';

interface Props {
  title: string;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
  onIconChange?: (icon: string) => void;
}

// 根据标题生成颜色
function generateColor(str: string): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e',
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// 获取标题的首字母或首字
function getInitials(title: string): string {
  if (!title) return '?';
  
  // 如果是中文，取第一个字
  if (/[\u4e00-\u9fa5]/.test(title)) {
    return title.charAt(0);
  }
  
  // 英文取首字母大写
  const words = title.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  return title.charAt(0).toUpperCase();
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-2xl',
};

// 常用图标分组
const ICON_GROUPS = [
  {
    name: '常用',
    icons: ['🌐', '💳', '🏦', '📧', '🎮', '💼', '🔐', '📱']
  },
  {
    name: '更多',
    icons: ['🛒', '🎵', '📺', '☁️', '🔑', '💻', '📷', '🎬', '🏠', '🚗', '✈️', '🎓', '💊', '🍔', '⚽', '🎨']
  }
];

export default function Avatar({ title, icon, size = 'md', editable = false, onIconChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const bgColor = generateColor(title);
  const initials = getInitials(title);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPicker(false);
    };
    if (showPicker) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showPicker]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    if (file.size > 1024 * 1024) {
      alert('图片大小不能超过 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onIconChange?.(base64);
      setShowPicker(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveIcon = () => {
    onIconChange?.('');
    setShowPicker(false);
  };

  const isCustomIcon = icon && icon.startsWith('data:image');

  return (
    <div className="relative" ref={pickerRef}>
      {/* 头像 */}
      <div
        className={`${sizeClasses[size]} rounded-xl flex items-center justify-center font-medium text-white overflow-hidden transition-all ${
          editable ? 'cursor-pointer hover:opacity-80 hover:scale-105' : ''
        }`}
        style={{ backgroundColor: isCustomIcon ? 'transparent' : bgColor }}
        onClick={() => editable && setShowPicker(!showPicker)}
      >
        {isCustomIcon ? (
          <img src={icon} alt={title} className="w-full h-full object-cover" />
        ) : icon ? (
          <span>{icon}</span>
        ) : (
          <span>{initials}</span>
        )}
        
        {/* 编辑指示器 */}
        {editable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors rounded-xl">
            <svg className="w-5 h-5 text-white opacity-0 hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* 图标选择器弹窗 */}
      {editable && showPicker && (
        <div className="absolute top-full left-0 mt-2 bg-theme-card border border-theme rounded-xl shadow-xl z-50 w-72 overflow-hidden">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
            <span className="text-sm font-medium text-theme">选择图标</span>
            <button
              onClick={() => setShowPicker(false)}
              className="p-1 text-theme-secondary hover:text-theme hover:bg-theme-bg rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* 图标网格 */}
          <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
            {ICON_GROUPS.map((group) => (
              <div key={group.name}>
                <div className="text-xs text-theme-secondary mb-2 px-1">{group.name}</div>
                <div className="grid grid-cols-8 gap-1">
                  {group.icons.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onIconChange?.(emoji);
                        setShowPicker(false);
                      }}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-all hover:bg-theme-primary/20 hover:scale-110 ${
                        icon === emoji ? 'bg-theme-primary/20 ring-2 ring-theme-primary' : 'hover:bg-theme-bg'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 底部操作 */}
          <div className="px-3 py-3 border-t border-theme bg-theme-bg/50">
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-theme-primary hover:opacity-90 text-white text-sm rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                上传图片
              </button>
              {(icon || isCustomIcon) && (
                <button
                  onClick={handleRemoveIcon}
                  className="px-3 py-2 bg-theme-card hover:bg-red-500/10 text-theme-secondary hover:text-red-400 text-sm rounded-lg border border-theme transition-colors"
                >
                  移除
                </button>
              )}
            </div>
            <p className="text-xs text-theme-secondary mt-2 text-center">支持 JPG、PNG，最大 1MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
