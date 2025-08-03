# Clauding GUI 多语言架构设计

## 概述

基于 Claudia 项目进行二次开发，添加完整的多语言支持功能，默认显示中文，用户可以方便切换语言。

## 技术架构

### 核心技术栈
- **i18n 框架**: react-i18next
- **语言检测**: i18next-browser-languagedetector
- **状态管理**: Zustand (持久化语言设置)
- **UI 组件**: 复用 Claudia 的 shadcn/ui 组件

### 文件结构
```
src/
├── i18n/
│   ├── index.ts          # i18n 配置和初始化
│   ├── types.ts          # TypeScript 类型定义
│   ├── languages.ts      # 支持的语言列表
│   └── locales/
│       ├── zh/          # 中文语言包
│       │   ├── common.json
│       │   ├── settings.json
│       │   ├── sessions.json
│       │   ├── agents.json
│       │   └── errors.json
│       └── en/          # 英文语言包
│           └── (同上结构)
├── stores/
│   └── i18nStore.ts     # 语言状态管理
├── hooks/
│   └── useI18n.ts       # i18n 相关 hooks
└── components/
    └── LanguageSelector.tsx  # 语言切换组件
```

## 实现特性

### 1. 语言切换
- 在设置页面的通用选项卡中添加语言选择器
- 支持中文和英文切换
- 显示国旗标识，增强用户体验

### 2. 持久化存储
- 使用 localStorage 存储用户语言偏好
- 使用 Zustand persist 中间件确保刷新后保持选择

### 3. 自动检测
- 首次访问时根据浏览器语言自动选择
- 支持手动覆盖自动检测结果

### 4. 命名空间管理
- 按功能模块划分语言包（common, settings, sessions, agents, errors）
- 便于维护和按需加载

## 已完成功能

1. ✅ i18n 基础架构搭建
2. ✅ 语言切换组件实现
3. ✅ 设置页面集成语言选择
4. ✅ Topbar 组件多语言支持
5. ✅ 基础语言包创建

## 待完成功能

1. 📋 更新所有组件使用 i18n
   - Settings 组件完整翻译
   - Sessions 相关组件
   - Agents 相关组件
   - 其他 UI 组件

2. 📋 完善语言包内容
   - 补充所有界面文本翻译
   - 添加更多语言支持（如日语、法语等）

3. 📋 优化功能
   - 动态语言包加载（减少初始加载大小）
   - RTL 语言支持预留
   - 语言切换动画效果

## 使用指南

### 在组件中使用多语言

```typescript
import { useI18n } from '@/hooks';

const MyComponent = () => {
  const { t } = useI18n();
  
  return (
    <div>
      <h1>{t('common:app.welcome')}</h1>
      <button>{t('common:actions.save')}</button>
    </div>
  );
};
```

### 添加新的翻译

1. 在对应的语言包文件中添加键值对
2. 在所有语言版本中保持键名一致
3. 使用嵌套结构组织相关翻译

### 语言包命名规范

- 使用小写字母和点号分隔
- 按功能模块组织
- 保持键名语义化

示例：
```json
{
  "navigation": {
    "projects": "项目",
    "sessions": "会话"
  },
  "actions": {
    "save": "保存",
    "cancel": "取消"
  }
}
```

## 技术细节

### i18n 初始化配置

- 默认语言：中文 (zh)
- 后备语言：中文 (zh)
- 命名空间：common, settings, sessions, agents, errors
- 检测顺序：localStorage → 浏览器语言
- React Suspense：禁用（避免与 Tauri 冲突）

### 性能优化

- 使用 React.memo 优化语言切换组件
- 语言包按需加载（预留接口）
- 避免不必要的重新渲染

## 部署注意事项

1. 确保所有 i18n 依赖正确安装
2. 构建时包含所有语言包文件
3. 测试不同语言环境下的显示效果
4. 验证持久化存储功能正常工作

## 后续扩展

1. **更多语言支持**：可轻松添加新语言
2. **专业术语管理**：建立术语表确保翻译一致性
3. **社区翻译**：开放翻译接口，接受社区贡献
4. **自动化测试**：添加多语言 UI 测试用例