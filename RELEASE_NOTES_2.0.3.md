# Clauding GUI v2.0.3 发布说明

## 📦 安装包信息

- **文件**: Clauding GUI_2.0.3_aarch64.dmg
- **大小**: 5.9M
- **平台**: macOS (Apple Silicon)
- **验证**: ✅ 已通过完整性验证

## 🚀 如何发布到 GitHub

1. 访问 Release 页面：
   https://github.com/miounet11/clauding-gui/releases/tag/v2.0.3

2. 点击 "Edit" 按钮编辑 Release

3. 上传 DMG 文件：
   - 文件位置: `src-tauri/target/release/bundle/dmg/Clauding GUI_2.0.3_aarch64.dmg`
   - 拖拽文件到 GitHub Release 的附件区域

4. 更新 Release 说明，添加下载链接部分：

```markdown
### 📦 下载

- **macOS (Apple Silicon)**: [Clauding GUI_2.0.3_aarch64.dmg](下载链接)
  - 支持: M1/M2/M3 芯片
  - 大小: 5.9M

### 🔧 安装说明

1. 下载 DMG 文件
2. 双击打开 DMG
3. 将 Clauding GUI 拖拽到 Applications 文件夹
4. 首次运行时，可能需要在"系统偏好设置 > 安全性与隐私"中允许运行
```

## 🌏 本版本更新内容

### 🔧 修复
- 修复所有硬编码英文文本，完全替换为 i18n 翻译
- StorageTab 组件：数据库存储界面完全本地化
- CCAgents 组件：代理操作按钮提示文本
- MCPServerList 组件："Copied!" 和 "Hide" 文本
- TabManager 组件：标签页滚动和未保存更改提示
- WebviewPreview 组件：URL 输入框占位符
- AgentExecution 组件：项目路径和任务输入框占位符
- ClaudeCodeSession 组件：会话名称输入框占位符

### ✨ 新增功能
- 新增 storage 翻译模块 - 数据库存储界面的完整中英文翻译
- 扩展 common 翻译模块 - 添加统一的提示文本和占位符

### 🎯 改进
- 完全中文化 - 确保所有按钮、提示和界面元素默认显示中文
- 语言切换优化 - 保持中英文切换功能的流畅性
- 用户体验提升 - 所有交互元素都有正确的本地化文本

## ⚠️ 注意事项

如果遇到 "无法打开，因为它来自身份不明的开发者" 的提示：
1. 打开"系统偏好设置" > "安全性与隐私"
2. 在"通用"标签页中，点击"仍要打开"
3. 或者右键点击应用，选择"打开"

## 🔍 验证文件完整性

```bash
hdiutil verify "Clauding GUI_2.0.3_aarch64.dmg"
```