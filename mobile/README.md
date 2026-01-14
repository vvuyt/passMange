# 密码管理器 - React Native 移动端

基于 React Native 的跨平台密码管理器，与 Electron 桌面版共享核心逻辑。

## 技术栈

- React Native 0.73
- TypeScript
- Zustand (状态管理)
- react-native-sqlite-storage (本地数据库)
- react-native-quick-crypto (加密)
- react-native-keychain (安全存储)
- react-native-biometrics (生物识别)

## 项目结构

```
mobile/
├── src/
│   ├── App.tsx              # 应用入口
│   ├── screens/             # 页面组件
│   │   ├── LoginScreen.tsx
│   │   ├── SetupScreen.tsx
│   │   └── HomeScreen.tsx
│   ├── services/            # 业务服务
│   │   ├── database.ts      # 数据库操作
│   │   └── vault.ts         # 密码库服务
│   ├── stores/              # 状态管理
│   │   └── vaultStore.ts
│   ├── types/               # 类型定义
│   │   └── models.ts
│   └── utils/               # 工具函数
│       ├── crypto.ts        # 加密模块
│       └── passwordGenerator.ts
├── android/                 # Android 原生代码
├── ios/                     # iOS 原生代码
└── package.json
```

## 开发

### 环境准备

1. 安装 Node.js 18+
2. 安装 React Native CLI: `npm install -g react-native-cli`
3. 配置 Android/iOS 开发环境

## 开发

### 环境准备

1. 安装 Node.js 18+
2. 安装 Android Studio 并配置 Android SDK
3. 设置 ANDROID_HOME 环境变量
4. 安装 JDK 17+

### 首次运行

由于 React Native 原生项目需要完整的 gradle wrapper，建议使用以下方式初始化：

**方式一：使用现有 Android 配置（推荐）**

```bash
cd mobile

# 安装依赖
npm install

# 下载 gradle wrapper（需要先安装 gradle）
cd android
gradle wrapper
cd ..

# 生成 debug keystore
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore debug.keystore -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=Android Debug,O=Android,C=US"
cd ../..

# 启动 Metro bundler
npm start

# 另开终端运行 Android
npm run android
```

**方式二：重新初始化原生项目**

如果上述方式有问题，可以重新生成原生项目：

```bash
# 在 mobile 目录外创建新的 RN 项目
npx react-native init PasswordManagerMobile

# 将 mobile/src 目录复制到新项目
# 将 mobile/package.json 的依赖合并到新项目
# 运行 npm install
```

### iOS 运行（需要 macOS）

```bash
cd ios && pod install && cd ..
npm run ios
```

## 与桌面版的关系

移动端复用了桌面版的：
- 数据模型 (types/models.ts)
- 状态管理逻辑 (stores/vaultStore.ts)
- 加密算法 (AES-256-GCM, PBKDF2)
- 数据库结构 (SQLite)

主要差异：
- UI 组件使用 React Native 重写
- 加密库从 Node.js crypto 改为 react-native-quick-crypto
- 数据库从 sql.js 改为 react-native-sqlite-storage
- 新增生物识别解锁支持

## 安全特性

- AES-256-GCM 加密
- PBKDF2 密钥派生 (60万次迭代)
- Keychain/Keystore 安全存储
- 生物识别解锁 (Face ID / Touch ID / 指纹)
- 应用切后台自动锁定

## 已完成功能

- [x] 登录/设置主密码
- [x] 密码列表展示
- [x] 添加/编辑密码
- [x] 密码详情页面
- [x] 密码生成器
- [x] 分类筛选
- [x] 搜索功能（带高亮）
- [x] 生物识别解锁 (Face ID / Touch ID / 指纹)
- [x] 设置页面
- [x] 修改主密码
- [x] 自动锁定（后台/空闲超时）
- [x] 快速复制用户名/密码
- [x] 收藏功能
- [x] 加密备份与恢复
- [x] CSV 明文导出（用于迁移）
- [x] 夸克网盘云同步
- [x] TOTP 二次验证

## TODO

- [ ] 标签管理
- [ ] 自动填充服务
