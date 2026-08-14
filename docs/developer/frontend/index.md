# 前端模块

止危前端（`shm-frontend`）负责用户界面、可视化看板与数据展示。

## 技术栈

- Vue 3.4（组合式 API + `<script setup>`）
- TypeScript 5.3
- Vite 5
- Element Plus（管理后台表单 / 表格）
- Three.js r160+（3D 数字孪生）
- ECharts 5（时序曲线 / 热力图 / 频谱图）
- Pinia（状态管理）
- Vue Router 4
- Axios（HTTP 客户端，统一拦截器处理 JWT refresh）

## 目录结构

```
shm-frontend/
├── src/
│   ├── api/            # API 封装（按领域：projects / devices / sensors / channels / data / alerts / analysis / models / dashboard）
│   ├── components/     # 公共组件
│   ├── views/          # 页面（按业务模块：project / device / sensor / dashboard / analysis / alarm）
│   ├── stores/         # Pinia 状态（auth / user / project / realtime）
│   ├── router/         # 路由配置
│   ├── utils/          # 工具函数（时间格式化、WebSocket 客户端、GLB 加载器）
│   ├── ws/             # WebSocket 客户端（自动重连 / 订阅项目频道）
│   ├── three/          # Three.js 场景封装（GLB 加载、测点标记、相机）
│   └── assets/         # 静态资源
├── package.json
└── vite.config.ts
```

## 核心模块

| 模块 | 职责 |
| --- | --- |
| `api/` | 封装所有后端 REST 调用；Axios 拦截器自动处理 401 → refresh → 重试 |
| `ws/` | WebSocket 客户端封装：`ws://<host>/ws/data?token=<JWT>`，自动重连，按项目分发事件 |
| `three/` | Three.js 场景：GLTFLoader 加载 GLB、传感器位置标记、轴向着色、相机控制 |
| `stores/auth.ts` | JWT 凭证管理；access 过期自动 refresh |
| `stores/realtime.ts` | 订阅项目频道，把 `data:realtime` / `data:alert` 推送给 Pinia |

## 数据展示

| 场景 | 实现 |
| --- | --- |
| 时序曲线 | ECharts `line` + `dataZoom`，按 `interval` 切换 `raw` / `1m` / `1h` |
| 频谱图 | 拉取分析任务 NPZ → `numpy-loader` → ECharts `bar` 渲染 |
| 3D 大屏 | GLB 加载 → 遍历 Mesh → 按 `position` 叠加传感器标记 → 实时值驱动颜色 |
| 告警列表 | 表格 + 筛选 + 实时插入（WebSocket `data:alert`） |

## 开发规范

- 组件使用组合式 API（`<script setup>`）
- 类型定义优先使用 `interface`
- API 请求统一封装到 `api/` 目录，禁止直接 `axios.get` 散落在组件里
- 样式优先使用项目已有的 UI 组件库；自定义 CSS 用 SCSS + scoped
- WebSocket 事件统一通过 Pinia action 分发，禁止在组件里直接订阅

## JWT 处理流程

1. 用户登录 → 存 access + refresh 到 localStorage（生产建议 httpOnly cookie）
2. Axios 请求拦截器：`Authorization: Bearer <access>`
3. 响应拦截器：遇到 401 → 调 `/auth/refresh` → 重试原请求
4. refresh 失败 → 清凭证 + 跳登录页

WebSocket 连接时把 access token 拼到 query：`ws://host/ws/data?token=<access>`。

## 相关链接

- [开发环境](/developer/environment)
- [接口文档](/developer/api/)
- [后端模块](/developer/backend/)