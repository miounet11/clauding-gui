#!/bin/bash

# Clauding GUI v2.0.2 Release 创建脚本

echo "🚀 Clauding GUI v2.0.2 Release 创建向导"
echo "======================================="
echo ""
echo "请按照以下步骤创建 GitHub Release："
echo ""
echo "1. 打开浏览器访问："
echo "   https://github.com/miounet11/clauding-gui/releases/new"
echo ""
echo "2. 在 'Choose a tag' 下拉框中选择：v2.0.2"
echo ""
echo "3. Release 标题填写："
echo "   Clauding GUI v2.0.2 - 完整的中英文双语支持"
echo ""
echo "4. 将以下内容复制到描述框："
echo "   （请打开 RELEASE-NOTES-v2.0.2.md 文件并复制全部内容）"
echo ""
echo "5. 如果您已经构建了安装包，请上传以下文件："
echo "   - macOS: *.dmg 文件"
echo "   - Linux: *.deb, *.rpm, *.AppImage 文件"
echo "   - Windows: *.msi 或 *.exe 文件"
echo ""
echo "6. 如果还没有构建安装包："
echo "   a. 安装 Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
echo "   b. 重启终端或运行: source \$HOME/.cargo/env"
echo "   c. 构建应用: npm run tauri build"
echo "   d. 构建产物在: src-tauri/target/release/bundle/"
echo ""
echo "7. 选择发布类型："
echo "   ✅ Set as the latest release"
echo ""
echo "8. 点击 'Publish release' 按钮"
echo ""
echo "📝 提示：如果暂时无法构建安装包，可以先创建 Release，"
echo "   稍后再编辑 Release 添加安装包。"
echo ""
echo "按任意键打开 Release 页面..."
read -n 1 -s

# 尝试在默认浏览器中打开 Release 页面
if command -v open &> /dev/null; then
    open "https://github.com/miounet11/clauding-gui/releases/new?tag=v2.0.2"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://github.com/miounet11/clauding-gui/releases/new?tag=v2.0.2"
else
    echo "请手动打开: https://github.com/miounet11/clauding-gui/releases/new?tag=v2.0.2"
fi