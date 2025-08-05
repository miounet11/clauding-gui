# 版本 2.0.7 发布说明

发布日期：2025-08-05

## 修复的问题

### 🐛 Bug 修复

- **修复 "env: node: No such file or directory" 错误**
  - 改进了对自定义 Node.js 安装路径的支持
  - 当 Claude Code 安装在包含 "node-v" 的路径时，自动将对应的 Node.js bin 目录添加到 PATH
  - 解决了在 `/Users/lu/Documents/claude code/node-v20.10.0-darwin-arm64/bin/claude` 等自定义路径下无法找到 node 命令的问题

## 技术细节

- 修改了 `create_command_with_env` 函数，扩展了对 Node.js 路径的检测
- 不仅支持 NVM 路径（`/.nvm/versions/node/`），还支持包含 `/node-v` 的自定义安装路径
- 自动将 Node.js 的 bin 目录添加到 PATH 环境变量中

## 问题原因

Claude Code CLI 使用 `#!/usr/bin/env node` 作为解释器，需要在 PATH 中找到 `node` 命令。当 Node.js 安装在非标准位置时，系统无法找到 node 命令，导致执行失败。

## 升级说明

此版本修复了执行 Claude Code 时的环境变量问题。如果您之前遇到 "env: node: No such file or directory" 错误，升级后应该可以正常使用。