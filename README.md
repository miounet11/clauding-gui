# Clauding GUI

一个基于 [Claudia](https://github.com/getAsterisk/claudia) 二次开发的多语言 GUI 界面，为 Claude Code 提供更友好的中文界面支持。

## 🌟 特性

- 🌏 **多语言支持** - 默认中文界面，支持中英文切换
- 🎨 **现代化 UI** - 基于 Tauri 2 + React + TypeScript
- 📊 **会话管理** - 可视化项目和会话管理
- 🤖 **自定义 AI 代理** - 创建专属的 AI 助手
- 📈 **使用分析** - 实时跟踪 API 使用情况和成本
- 🔌 **MCP 服务器管理** - 轻松管理模型上下文协议服务器

## 📦 技术栈

- **前端**: React 18 + TypeScript + Vite
- **后端**: Rust + Tauri 2
- **UI 组件**: Tailwind CSS + shadcn/ui
- **国际化**: react-i18next
- **状态管理**: Zustand
- **数据库**: SQLite

## 🚀 快速开始

### 前置要求

- [Rust](https://www.rust-lang.org/) (1.70.0+)
- [Bun](https://bun.sh/) (最新版本)
- [Claude Code CLI](https://claude.ai/code) (可选)

### 开发环境

```bash
# 克隆项目
git clone https://github.com/miounet11/clauding-gui.git
cd clauding-gui

# 安装依赖
bun install

# 启动开发服务器
bun run tauri dev
```

### 构建应用

```bash
# 构建生产版本
bun run tauri build
```

## 🌐 语言切换

应用默认显示中文界面。您可以在设置页面的"通用"选项卡中切换语言。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目基于 [AGPL-3.0](LICENSE) 许可证开源。

## 🙏 致谢

- 感谢 [Claudia](https://github.com/getAsterisk/claudia) 项目提供的基础
- 感谢所有贡献者的支持

---

Made with ❤️ by [@miounet11](https://github.com/miounet11)