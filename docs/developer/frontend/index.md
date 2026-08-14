# 前端模块

止危前端负责用户界面、可视化看板与数据展示。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Pinia（状态管理）
- Vue Router
- ECharts / Three.js（可视化）

## 目录结构

```
shm-frontend/
├── src/
│   ├── api/          # API 封装
│   ├── components/   # 公共组件
│   ├── views/        # 页面
│   ├── stores/       # Pinia 状态
│   ├── router/       # 路由配置
│   ├── utils/        # 工具函数
│   └── assets/       # 静态资源
├── package.json
└── vite.config.ts
```

## 开发规范

- 组件使用组合式 API（`<script setup>`）
- 类型定义优先使用 `interface`
- API 请求统一封装到 `api/` 目录
- 样式优先使用项目已有的 UI 组件库

## 相关链接

- [开发环境](/developer/environment)
- [接口文档](/developer/api/)
