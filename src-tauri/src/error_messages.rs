use std::collections::HashMap;

/// 获取中文错误消息
pub fn get_chinese_error_message(error: &str) -> String {
    let mut messages = HashMap::new();
    
    // Node.js 相关错误
    messages.insert(
        "Claude Code not found",
        "未找到 Claude Code。请确保已安装或允许自动下载 Node.js。"
    );
    messages.insert(
        "No system Node.js installation found",
        "未找到系统 Node.js 安装。系统将尝试下载内置版本。"
    );
    messages.insert(
        "Node.js runtime not available",
        "Node.js 运行时不可用。请安装 Node.js 或允许自动下载。"
    );
    messages.insert(
        "Failed to download Node.js",
        "下载 Node.js 失败。请检查网络连接并重试。"
    );
    messages.insert(
        "Failed to ensure Node.js runtime",
        "无法确保 Node.js 运行时可用。请手动安装 Node.js。"
    );
    
    // Claude 相关错误
    messages.insert(
        "Failed to find claude binary",
        "未找到 Claude 可执行文件。请确保 Claude Code CLI 已正确安装。"
    );
    messages.insert(
        "Failed to spawn Claude",
        "启动 Claude 失败。请检查安装并重试。"
    );
    messages.insert(
        "Failed to execute claude command",
        "执行 Claude 命令失败。请检查 Claude Code 是否正常工作。"
    );
    
    // MCP 相关错误
    messages.insert(
        "Failed to add MCP server",
        "添加 MCP 服务器失败。请检查配置并重试。"
    );
    messages.insert(
        "Failed to list MCP servers",
        "列出 MCP 服务器失败。请检查配置文件。"
    );
    messages.insert(
        "Failed to start MCP server",
        "启动 MCP 服务器失败。请确保服务器已正确安装。"
    );
    
    // 文件系统相关错误
    messages.insert(
        "Failed to read file",
        "读取文件失败。请检查文件权限。"
    );
    messages.insert(
        "Failed to write file",
        "写入文件失败。请检查目录权限。"
    );
    messages.insert(
        "Failed to create directory",
        "创建目录失败。请检查权限设置。"
    );
    messages.insert(
        "Failed to get home directory",
        "获取用户主目录失败。"
    );
    
    // 数据库相关错误
    messages.insert(
        "Failed to open database",
        "打开数据库失败。请检查应用数据目录。"
    );
    messages.insert(
        "Failed to update row",
        "更新数据失败。请重试操作。"
    );
    messages.insert(
        "Failed to insert row",
        "插入数据失败。请检查数据格式。"
    );
    
    // 进程管理相关错误
    messages.insert(
        "Failed to kill process",
        "终止进程失败。进程可能已经结束。"
    );
    messages.insert(
        "Failed to register process",
        "注册进程失败。请重启应用。"
    );
    
    // 网络相关错误
    messages.insert(
        "Failed to fetch",
        "网络请求失败。请检查网络连接。"
    );
    messages.insert(
        "Failed to download",
        "下载失败。请检查网络连接并重试。"
    );
    
    // 查找匹配的中文错误消息
    for (key, value) in messages.iter() {
        if error.contains(key) {
            // 如果错误包含额外信息，保留它
            if error.len() > key.len() {
                let extra = error.replace(key, "").trim().to_string();
                if !extra.is_empty() && extra.starts_with(':') {
                    return format!("{}{}", value, extra);
                }
            }
            return value.to_string();
        }
    }
    
    // 如果没有找到匹配的中文消息，返回原始错误
    // 但尝试改善格式
    if error.starts_with("Failed to") {
        return error.replace("Failed to", "操作失败：");
    }
    
    error.to_string()
}

/// 格式化错误消息，添加解决建议
pub fn format_error_with_suggestion(error: &str) -> String {
    let chinese_error = get_chinese_error_message(error);
    
    // 根据错误类型添加解决建议
    let suggestion = if error.contains("Node.js") {
        Some("\n\n💡 解决建议：\n1. 通过 Homebrew 安装 Node.js: brew install node\n2. 或访问 https://nodejs.org 下载安装\n3. 或允许应用自动下载内置版本")
    } else if error.contains("Claude Code not found") {
        Some("\n\n💡 解决建议：\n1. 运行: npm install -g @anthropic-ai/claude-code\n2. 或使用应用内的安装向导")
    } else if error.contains("permission") || error.contains("权限") {
        Some("\n\n💡 解决建议：\n请检查文件或目录的访问权限")
    } else if error.contains("network") || error.contains("网络") || error.contains("download") {
        Some("\n\n💡 解决建议：\n1. 检查网络连接\n2. 检查代理设置\n3. 稍后重试")
    } else {
        None
    };
    
    match suggestion {
        Some(s) => format!("{}{}", chinese_error, s),
        None => chinese_error,
    }
}

/// 获取操作成功的中文消息
pub fn get_success_message(action: &str) -> String {
    let messages = HashMap::from([
        ("install", "安装成功"),
        ("download", "下载完成"),
        ("start", "启动成功"),
        ("stop", "停止成功"),
        ("save", "保存成功"),
        ("delete", "删除成功"),
        ("update", "更新成功"),
        ("create", "创建成功"),
        ("connect", "连接成功"),
        ("import", "导入成功"),
        ("export", "导出成功"),
    ]);
    
    messages.get(action).map(|s| s.to_string())
        .unwrap_or_else(|| format!("{} 成功", action))
}