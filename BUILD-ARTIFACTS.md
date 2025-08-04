# Clauding GUI v2.0.2 构建产物

## 构建时间
2025-08-04

## 已生成的安装包

### macOS (Apple Silicon)
- **DMG 安装包**: `Clauding GUI_2.0.2_aarch64.dmg`
  - 路径: `src-tauri/target/release/bundle/dmg/Clauding GUI_2.0.2_aarch64.dmg`
  - 大小: 5.9 MB
  - 架构: Apple Silicon (M1/M2/M3)
  
- **App Bundle**: `Clauding GUI.app`
  - 路径: `src-tauri/target/release/bundle/macos/Clauding GUI.app`
  - 可直接运行或拖入 Applications 文件夹

## 发布到 GitHub

### 使用命令行上传（需要先安装 gh）
```bash
# 安装 GitHub CLI
brew install gh

# 登录 GitHub
gh auth login

# 创建 Release 并上传文件
gh release create v2.0.2 \
  --title "Clauding GUI v2.0.2 - 完整的中英文双语支持" \
  --notes-file RELEASE-NOTES-v2.0.2.md \
  "src-tauri/target/release/bundle/dmg/Clauding GUI_2.0.2_aarch64.dmg"
```

### 手动上传
1. 访问: https://github.com/miounet11/clauding-gui/releases/new
2. 选择标签: `v2.0.2`
3. 上传文件: `src-tauri/target/release/bundle/dmg/Clauding GUI_2.0.2_aarch64.dmg`

## 注意事项

- 当前只构建了 macOS Apple Silicon 版本
- 如需构建 Intel Mac 版本，需要在 Intel Mac 上构建或使用交叉编译
- Linux 和 Windows 版本需要在相应平台上构建

## 测试安装包

在上传前，建议先测试安装包：
```bash
# 打开 DMG 文件
open "src-tauri/target/release/bundle/dmg/Clauding GUI_2.0.2_aarch64.dmg"
```

## 文件完整性

DMG 文件信息：
- 文件名: Clauding GUI_2.0.2_aarch64.dmg
- 大小: 6,193,432 字节
- 创建时间: 2025-08-04 19:04