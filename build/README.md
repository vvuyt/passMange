# 构建资源

此目录用于存放应用打包所需的资源文件。

## 图标文件

请在此目录放置以下图标文件：

- `icon.ico` - Windows 图标 (256x256 或更大)
- `icon.icns` - macOS 图标
- `icons/` - Linux 图标目录，包含不同尺寸的 PNG 文件：
  - `16x16.png`
  - `32x32.png`
  - `48x48.png`
  - `64x64.png`
  - `128x128.png`
  - `256x256.png`
  - `512x512.png`

## 生成图标

可以使用在线工具或命令行工具从一个高分辨率 PNG 生成所有格式：

```bash
# 使用 electron-icon-builder (需要先安装)
npm install -g electron-icon-builder
electron-icon-builder --input=./icon.png --output=./build
```

## 打包命令

```bash
# 构建并打包
npm run electron:build

# 仅打包（需要先运行 npm run build）
npx electron-builder
```
