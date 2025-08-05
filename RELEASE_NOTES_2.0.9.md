# 版本 2.0.9 发布说明

发布日期：2025-08-05

## 修复的问题

### 🐛 修复 Claude API 连接错误

解决了在 Clauding GUI 中运行 Claude Code 时出现的 "API Error: Connection error" 问题。

#### 问题原因：
- Claude CLI 在终端中可以正常工作，但在 Tauri 应用中运行时缺少必要的环境变量
- 特别是 ANTHROPIC_API_KEY 等认证相关的环境变量没有被传递给子进程

#### 修复内容：
1. **环境变量传递优化**
   - 添加 `ANTHROPIC_API_KEY` 环境变量传递
   - 支持所有 `CLAUDE_` 前缀的环境变量
   - 确保代理相关环境变量正确传递（HTTP_PROXY、HTTPS_PROXY、NO_PROXY 等）

2. **代码改进**
   - 修复了 `create_command_with_env` 函数中的环境变量白名单
   - 同时更新了标准库和 Tokio 版本的命令创建函数
   - 移除了重复的环境变量检查

## 使用说明

此版本修复了 Claude CLI 在 Clauding GUI 中的连接问题。如果您之前遇到 "API Error: Connection error" 错误，更新后应该可以正常使用。

## 验证修复

更新后，您应该能够：
1. 正常发送消息给 Claude
2. 不再看到 "API Error: Connection error" 错误
3. Claude 能够正确响应您的提示