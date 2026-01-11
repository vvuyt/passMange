# 密码管理器

一个安全、简洁的本地密码管理器，基于 Electron 构建。

## 功能特性

- 🔐 **安全存储** - AES-256-GCM 加密，主密码永不存储
- 🔑 **密码生成** - 可配置长度、字符类型的强密码生成器
- 📥 **批量导入** - 支持从 Excel、Chrome、Firefox、Edge 导入密码
- 🏷️ **分类管理** - 使用分类和标签组织密码
- 💾 **备份恢复** - 加密备份，支持版本管理
- 🔒 **二次验证** - TOTP 双因素认证保护
- 📱 **二维码分享** - 临时安全分享密码
- ☁️ **云同步** - 支持夸克网盘同步（可选）

## 安全特性

- **零知识架构** - 主密码仅用于派生加密密钥，不存储任何形式的密码
- **分层加密** - 数据库级加密 + 字段级加密双重保护
- **PBKDF2 密钥派生** - 60万次迭代，抵御暴力破解
- **本地优先** - 所有数据存储在本地，完全掌控你的数据

## 技术栈

- **框架**: Electron + React + TypeScript
- **数据库**: sql.js (SQLite)
- **加密**: Node.js crypto (AES-256-GCM, PBKDF2)
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **测试**: Vitest + fast-check

## 安装

### 下载安装包

从 [Releases](../../releases) 页面下载对应平台的安装包：

- Windows: `密码管理器-x.x.x-x64.exe`
- macOS: `密码管理器-x.x.x-x64.dmg`
- Linux: `密码管理器-x.x.x-x64.AppImage`

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/your-username/password-manager.git
cd password-manager

# 安装依赖
npm install

# 开发模式
npm run electron:dev

# 构建生产版本
npm run electron:build
```

## 使用说明

### 首次使用

1. 启动应用后，设置主密码
2. 主密码是唯一的访问凭证，请牢记
3. 可选：启用 TOTP 二次验证增强安全性

### 添加密码

1. 点击「添加密码」按钮
2. 填写网站、用户名、密码等信息
3. 可使用内置密码生成器创建强密码

### 导入密码

支持从以下来源导入：
- Excel 文件 (.xlsx)
- Chrome 导出的 CSV
- Firefox 导出的 CSV
- Edge 导出的 CSV

### 备份与恢复

- 定期创建加密备份
- 备份文件可安全存储在任何位置
- 恢复时需要主密码验证

## 开发

```bash
# 运行测试
npm test

# 监听模式测试
npm run test:watch

# 仅构建前端
npm run build

# 仅构建 Electron
npm run build:electron
```

## 项目结构

```
├── src/                    # React 渲染进程
│   ├── components/         # UI 组件
│   ├── hooks/              # React Hooks
│   ├── stores/             # Zustand 状态
│   └── utils/              # 工具函数
├── electron/               # Electron 主进程
│   ├── main/
│   │   ├── crypto/         # 加密模块
│   │   ├── storage/        # 数据存储
│   │   ├── generator/      # 密码生成
│   │   ├── import/         # 导入模块
│   │   ├── backup/         # 备份模块
│   │   ├── totp/           # TOTP 验证
│   │   └── sync/           # 云同步
│   └── preload/            # 预加载脚本
└── .kiro/specs/            # 功能规格文档
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 免责声明

本软件按「现状」提供，不提供任何明示或暗示的保证。请妥善保管主密码，丢失主密码将无法恢复数据。
