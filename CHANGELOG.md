# 更新日志

所有重要的更改都将记录在此文件中。

## [2.0.9] - 2025-08-05

### 🐛 Bug 修复

- **修复 Claude API 连接错误**
  - ✅ 修复了在 Clauding GUI 中运行时出现 "API Error: Connection error" 的问题
  - ✅ 添加 ANTHROPIC_API_KEY 环境变量传递，确保 Claude CLI 可以正确认证
  - ✅ 添加所有 CLAUDE_ 前缀的环境变量传递
  - ✅ 确保代理环境变量（HTTP_PROXY、HTTPS_PROXY 等）正确传递
  - ✅ 修复了环境变量白名单，避免关键配置丢失

### 🔧 技术改进

- 改进了 `create_command_with_env` 函数，确保所有必要的环境变量都能传递给子进程
- 同时修复了标准库和 Tokio 命令创建函数中的环境变量处理

## [2.0.8] - 2025-08-05

### ⚡ 性能优化

- **优化会话历史加载性能**
  - ✅ 添加分页加载支持，避免一次性加载大量消息导致的卡顿
  - ✅ 当会话消息超过 1000 条时，自动只加载最新的 1000 条消息
  - ✅ 添加快速消息计数功能，无需加载全部内容即可获取总数
  - ✅ 优化文件读取性能，使用 8KB 缓冲区提升读取速度
  - ✅ 显示跳过消息数量的友好提示

### 🔧 技术改进

- 新增 `load_session_history_paginated` API 支持分页加载
- 新增 `get_session_message_count` API 快速获取消息数量
- 优化 BufReader 缓冲区大小，提升大文件读取性能

## [2.0.7] - 2025-08-05

### 🐛 Bug 修复

- **修复 Node.js 环境错误**
  - ✅ 解决 "env: node: No such file or directory" 错误
  - ✅ 支持自定义 Node.js 安装路径（如 `/Documents/claude code/node-v*`）
  - ✅ 自动将 Node.js bin 目录添加到 PATH 环境变量

## [2.0.6] - 2025-08-05

### 🎨 视觉更新

#### 应用图标
- **更换应用图标** - 使用全新的品牌图标
  - ✅ 生成所有平台所需的图标尺寸
  - ✅ macOS .icns 格式支持
  - ✅ 多分辨率 PNG 图标 (32x32 到 512x512)

### 🌐 国际化完善

#### NFO 页面
- **完全中文化** - NFO 致谢页面
  - ✅ 版本信息更新为 "CLAUDING GUI v2.0.6"
  - ✅ 添加项目 GitHub 链接
  - ✅ "File a bug" → "报告问题"
  - ✅ 所有标题和内容翻译为中文

#### 设置页面
- **修复硬编码文本** - 设置和分析同意对话框
  - ✅ 设置页面所有英文标签
  - ✅ 分析同意对话框文本
  - ✅ 添加缺失的翻译键

### 📚 文档更新
- **中文化文档**
  - ✅ CONTRIBUTING.md 贡献指南
  - ✅ cc_agents/README.md 代理说明
  - ✅ 页面标题更新

## [2.0.5] - 2025-08-05

### 🐛 Bug 修复

#### Node 环境问题
- **修复 "env: node: No such file or directory" 错误**
  - ✅ 解决了应用启动时无法找到 node 的问题
  - ✅ 更新了项目依赖

#### 界面文本国际化
- **修复硬编码英文文本** - 将主页面的英文改为中文
  - ✅ "CC Projects" → "CC 项目"
  - ✅ "Browse your Claude Code sessions" → "浏览您的 Claude Code 会话"
  - ✅ "New Claude Code session" → "新建 Claude Code 会话"
  - ✅ 错误消息本地化

### 🌐 国际化改进
- **完善中文翻译** - 添加缺失的翻译键
  - ✅ projects.json：添加 title、subtitle、new_session、no_projects_found
  - ✅ errors.json：添加 failed_to_load_projects、failed_to_load_sessions

## [2.0.4] - 2025-08-04

### 🔧 修复

#### MCP 服务器加载问题
- **修复 Claude Code CLI 检测** - 添加自定义安装路径支持
  - ✅ 支持 `/Documents/claude code/` 目录下的 Claude 安装
  - ✅ 自动将 Claude 路径添加到 PATH 环境变量
  - ✅ 改进了二进制文件搜索逻辑

#### 问题原因
- macOS 打包应用有限制的 PATH 环境
- Claude Code 安装在非标准路径无法被检测到

#### 解决方案
- 扩展了 Claude 二进制文件搜索路径列表
- 确保自定义路径被包含在命令执行环境中

## [2.0.3] - 2025-08-04

### 🌏 本地化完善

#### 🔧 修复
- **修复所有硬编码英文文本** - 完全替换为 i18n 翻译
  - ✅ StorageTab 组件：数据库存储界面完全本地化
  - ✅ CCAgents 组件：代理操作按钮提示文本
  - ✅ MCPServerList 组件："Copied!" 和 "Hide" 文本
  - ✅ TabManager 组件：标签页滚动和未保存更改提示
  - ✅ WebviewPreview 组件：URL 输入框占位符
  - ✅ AgentExecution 组件：项目路径和任务输入框占位符
  - ✅ ClaudeCodeSession 组件：会话名称输入框占位符

#### ✨ 新增功能
- **新增 storage 翻译模块** - 数据库存储界面的完整中英文翻译
- **扩展 common 翻译模块** - 添加统一的提示文本和占位符
  - tooltips：所有 UI 元素的悬停提示
  - placeholders：所有输入框的占位符文本

#### 🎯 改进
- **完全中文化** - 确保所有按钮、提示和界面元素默认显示中文
- **语言切换优化** - 保持中英文切换功能的流畅性
- **用户体验提升** - 所有交互元素都有正确的本地化文本

## [2.0.2] - 2025-08-04

### ✨ 功能更新
- 实现多语言系统架构
- 设置默认语言为中文
- 添加语言切换组件

## [2.0.1] - 2025-08-03

### 🎉 首个发布版本

#### 新增功能
- 🌏 完整的多语言支持（中文/英文）
- 🇨🇳 默认中文界面
- 🔄 便捷的语言切换功能
- 📝 全新的中文 README

#### 改进
- 更新项目名称为 Clauding GUI
- 优化了用户界面的中文体验
- 改进了设置页面的布局

#### 技术更新
- 集成 react-i18next 国际化框架
- 使用 Zustand 管理语言状态
- 支持语言偏好持久化存储

### 基于
- 基于 [Claudia](https://github.com/getAsterisk/claudia) v0.1.0 开发