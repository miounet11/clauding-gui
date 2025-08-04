# Clauding GUI 构建指南

## 前置要求

### 1. 安装 Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

安装后需要重启终端或运行：
```bash
source $HOME/.cargo/env
```

### 2. 安装 Node.js 依赖
```bash
npm install
# 或使用 bun
bun install
```

### 3. 安装 Tauri 系统依赖

#### macOS
```bash
xcode-select --install
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

#### Linux (Fedora)
```bash
sudo dnf install gtk3-devel webkit2gtk4.0-devel \
    openssl-devel curl wget \
    @development-tools \
    libappindicator-gtk3-devel \
    librsvg2-devel
```

## 构建步骤

### 1. 构建前端
```bash
npm run build
```

### 2. 构建 Tauri 应用
```bash
npm run tauri build
```

## 构建产物位置

构建完成后，安装包会生成在以下位置：

- macOS: `src-tauri/target/release/bundle/dmg/`
- Linux: 
  - DEB: `src-tauri/target/release/bundle/deb/`
  - RPM: `src-tauri/target/release/bundle/rpm/`
  - AppImage: `src-tauri/target/release/bundle/appimage/`

## 发布到 GitHub

### 1. 使用 GitHub CLI
```bash
# 安装 gh (如果还没安装)
brew install gh  # macOS
# 或查看 https://github.com/cli/cli#installation

# 创建 release
gh release create v2.0.2 \
  --title "Clauding GUI v2.0.2" \
  --notes-file RELEASE-NOTES-v2.0.2.md \
  src-tauri/target/release/bundle/dmg/*.dmg \
  src-tauri/target/release/bundle/deb/*.deb \
  src-tauri/target/release/bundle/appimage/*.AppImage
```

### 2. 手动发布
1. 访问 https://github.com/miounet11/clauding-gui/releases/new
2. 选择标签 `v2.0.2`
3. 填写标题：`Clauding GUI v2.0.2`
4. 复制 `RELEASE-NOTES-v2.0.2.md` 的内容到描述框
5. 上传构建好的安装包
6. 发布 Release

## 故障排除

### Rust 安装失败
如果 Rust 安装脚本失败，可以尝试：
1. 手动下载安装器：https://www.rust-lang.org/tools/install
2. 使用包管理器：
   - macOS: `brew install rust`
   - Linux: 查看发行版的包管理器

### 构建失败
1. 确保所有依赖都已安装
2. 清理缓存：
   ```bash
   cd src-tauri
   cargo clean
   cd ..
   npm run tauri build
   ```

### 签名问题（macOS）
如果遇到签名问题，可以暂时跳过签名：
```bash
npm run tauri build -- --target universal-apple-darwin
```