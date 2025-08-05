# 🤖 Claudia CC 代理

<div align="center">
  <p>
    <strong>为 Claudia 预构建的 AI 代理，由 Claude Code 驱动</strong>
  </p>
  <p>
    <a href="#可用代理">浏览代理</a> •
    <a href="#导入代理">导入指南</a> •
    <a href="#导出代理">导出指南</a> •
    <a href="#贡献">贡献</a>
  </p>
</div>

---

## 📦 可用代理

| 代理 | 模型 | 描述 | 默认任务 |
|-------|-------|-------------|--------------|
| **🎯 Git 提交机器人**<br/>🤖 `bot` | <img src="https://img.shields.io/badge/Sonnet-blue?style=flat-square" alt="Sonnet"> | **使用智能提交消息自动化您的 Git 工作流**<br/><br/>分析 Git 仓库更改，生成遵循 Conventional Commits 规范的详细提交消息，并将更改推送到远程仓库。 | "推送所有更改。" |
| **🛡️ 安全扫描器**<br/>🛡️ `shield` | <img src="https://img.shields.io/badge/Opus-purple?style=flat-square" alt="Opus"> | **高级 AI 驱动的静态应用安全测试 (SAST)**<br/><br/>通过生成专门的子代理执行全面的安全审计：代码库智能收集、威胁建模 (STRIDE)、漏洞扫描 (OWASP Top 10, CWE)、漏洞利用验证、修复设计和专业报告生成。 | "审查代码库的安全问题。" |
| **🧪 单元测试机器人**<br/>💻 `code` | <img src="https://img.shields.io/badge/Opus-purple?style=flat-square" alt="Opus"> | **为任何代码库自动生成全面的单元测试**<br/><br/>分析代码库并生成全面的单元测试：分析代码结构、创建测试计划、编写符合您风格的测试、验证执行、优化覆盖率（总体 >80%，关键路径 100%）并生成文档。 | "为此代码库生成单元测试。" |

### 可用图标

创建代理时可以选择这些图标选项：
- `bot` - 🤖 通用
- `shield` - 🛡️ 安全相关
- `code` - 💻 开发
- `terminal` - 🖥️ 系统/CLI
- `database` - 🗄️ 数据操作
- `globe` - 🌐 网络/Web
- `file-text` - 📄 文档
- `git-branch` - 🌿 版本控制

---

## 📥 导入代理

### 方法 1：从 GitHub 导入（推荐）

1. 在 Claudia 中，导航到 **CC 代理**
2. 点击 **导入** 下拉按钮
3. 选择 **从 GitHub**
4. 从官方仓库浏览可用代理
5. 预览代理详情并点击 **导入代理**

### 方法 2：从本地文件导入

1. 从此仓库下载 `.claudia.json` 文件
2. 在 Claudia 中，导航到 **CC 代理**
3. 点击 **导入** 下拉按钮
4. 选择 **从文件**
5. 选择下载的 `.claudia.json` 文件

## 📤 导出代理

### 导出您的自定义代理

1. 在 Claudia 中，导航到 **CC 代理**
2. 在网格中找到您的代理
3. 点击 **导出** 按钮
4. 选择保存 `.claudia.json` 文件的位置

### 代理文件格式

所有代理都以 `.claudia.json` 格式存储，具有以下结构：

```json
{
  "version": 1,
  "exported_at": "2025-01-23T14:29:58.156063+00:00",
  "agent": {
    "name": "您的代理名称",
    "icon": "bot",
    "model": "opus|sonnet|haiku",
    "system_prompt": "您的代理指令...",
    "default_task": "默认任务描述"
  }
}
```

## 🔧 技术实现

### 导入/导出如何工作

代理导入/导出系统建立在强大的架构之上：

#### 后端 (Rust/Tauri)
- **存储**：SQLite 数据库存储代理配置
- **导出**：将代理数据序列化为带版本控制的 JSON
- **导入**：在导入时验证和去重代理
- **GitHub 集成**：通过 GitHub API 获取代理

#### 前端 (React/TypeScript)
- **UI 组件**：
  - `CCAgents.tsx` - 主要代理管理界面
  - `GitHubAgentBrowser.tsx` - GitHub 仓库浏览器
  - `CreateAgent.tsx` - 代理创建/编辑表单
- **文件操作**：用于导入/导出的原生文件对话框
- **实时更新**：实时代理状态和执行监控

### 关键特性

1. **版本控制**：每个代理导出都包含版本元数据
2. **防止重复**：自动命名冲突解决
3. **模型选择**：在 Opus、Sonnet 和 Haiku 模型之间选择
4. **GitHub 集成**：直接从官方仓库导入

## 🤝 贡献

我们欢迎代理贡献！以下是添加您的代理的方法：

### 1. 创建您的代理
在 Claudia 中设计和测试您的代理，使其具有明确、专注的目的。

### 2. 导出您的代理
将您的代理导出为具有描述性名称的 `.claudia.json` 文件。

### 3. 提交 Pull Request
1. Fork 此仓库
2. 将您的 `.claudia.json` 文件添加到 `cc_agents` 目录
3. 使用您的代理详情更新此 README
4. 提交包含代理功能描述的 PR

### 代理指南

- **单一目的**：每个代理应该擅长一项特定任务
- **清晰文档**：编写全面的系统提示
- **模型选择**：简单任务使用 Haiku，通用任务使用 Sonnet，复杂推理使用 Opus
- **命名**：使用清楚表明代理功能的描述性名称

## 📜 许可证

这些代理在与 Claudia 项目相同的许可证下提供。有关详细信息，请参阅主 LICENSE 文件。

---

<div align="center">
  <strong>由 Claudia 社区用 ❤️ 构建</strong>
</div>