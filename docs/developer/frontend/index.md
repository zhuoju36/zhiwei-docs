# 前端模块

止危前端（`shm-frontend`）负责用户界面、可视化看板与数据展示。

## 技术栈

- Vue 3.4（组合式 API + `<script setup>`）
- TypeScript 5.3
- Vite 5
- Element Plus 2.7（管理后台表单 / 表格 / DataV 装饰）
- Three.js r160（3D 数字孪生）
- ECharts 5 + vue-echarts（时序曲线 / 频谱图）
- Pinia 2
- Vue Router 4
- Axios（HTTP 客户端，统一拦截器处理 JWT refresh）
- Vitest + Playwright（单测 + e2e）

## 目录结构

```
shm-frontend/
├── src/
│   ├── api/            # API 封装（按领域）+ request.ts（Axios 实例/envelope 解包/401 重试）+ pager.ts（fetchAllPages）+ types.ts（Envelope<T> / PageData<T>）
│   ├── components/     # 公共组件
│   │   ├── Common/         # AppHeader / AppFooter / DataTable / PermissionWrapper 等
│   │   ├── ThreeScene/     # SceneManager / ModelLoader / PointManager（纯 TS 类，Three.js 对象不进入 Vue 响应式）
│   │   └── Charts/         # 时序曲线 / 频谱图 / 仪表盘封装
│   ├── views/          # 页面（按业务模块：Login / Dashboard / Analysis / Admin）
│   ├── stores/         # Pinia 状态
│   │   ├── user.ts         # token + profile（role/is_active），路由守卫用 role
│   │   ├── dashboard.ts    # 大屏数据缓存：projects / devices / sensors / channels / models / channelSensorMap
│   │   ├── websocket.ts    # /ws/data 客户端，自动重连，按项目分发
│   │   └── app.ts          # 全局 UI 状态
│   ├── router/         # 路由表 + 导航守卫（requiresAuth / requiresAdmin）
│   ├── composables/    # useAuth / useWebSocket / usePermission
│   ├── utils/          # 工具函数
│   │   ├── format.ts        # 时间 / 数值 / 单位格式化
│   │   ├── color.ts         # 状态 → 颜色映射
│   │   └── three/           # buildSensorVisuals 纯函数（不含 Three.js 渲染代码，便于单测）
│   ├── types/          # 全局 TypeScript 类型（按领域）
│   ├── plugins/        # Element Plus / ECharts 注册
│   ├── assets/         # 静态资源 / 全局样式
│   ├── App.vue
│   └── main.ts
├── tests/
│   ├── unit/           # 纯函数单测（Vitest）
│   ├── api/            # 后端接口契约测试（直连 8000 端口，Axios 信封断言 + RBAC 验证）
│   └── e2e/            # Playwright 端到端（登录 / 大屏 / Admin 入口）
├── docs/               # 后端 issue 文档（提交给后端 team 的契约偏差清单）
├── package.json
└── vite.config.ts
```

## 核心模块

| 模块 | 职责 |
| --- | --- |
| `api/request.ts` | Axios 实例：响应拦截器解 envelope、业务码透传；401 → refresh → 重试原请求；过期跳登录 |
| `api/pager.ts` | `fetchAllPages(fetcher)`：基于 `PageData<T>` 自动翻页拉全 |
| `stores/user.ts` | 直接读后端 `LoginResponse.user_id/username/email/role/is_active`，**不解 JWT**；profile 持久化到 `shm_user_profile` |
| `stores/dashboard.ts` | 大屏核心：`projects / devices / sensors / channels / models / channelSensorMap`；`selectProject` 触发 watch → 重新拉 `loadChannels` + `loadModels` |
| `composables/useWebSocket.ts` | WebSocket：`ws://<host>/ws/data?token=<JWT>`，自动重连、心跳，按 `project_id` 分发 `data:realtime` / `data:alert` |
| `components/ThreeScene/` | Three.js 纯 TS 封装（不进 Vue 响应式）：场景管理 / 模型加载 / 测点渲染 |

## 数据展示

| 场景 | 实现 |
| --- | --- |
| 时序曲线 | ECharts `line` + `dataZoom`，按 `interval` 切换 `raw` / `1m` / `1h` |
| 频谱图 | 拉取分析任务 NPZ → `utils/npy.ts` → ECharts `bar` 渲染 |
| 3D 数字孪生 | GLB 加载 → `SceneManager.fitToModel` 自适应视域 → `PointManager` 渲染测点（球 + 名称 Sprite）→ 鼠标 hover 高亮 + click 选中通道 |
| 告警列表 | 表格 + 筛选 + 实时插入（WebSocket `data:alert`） |

## 3D 数字孪生模块

`components/ThreeScene/` 三个类各自负责一摊：

### SceneManager（场景管理 + 渲染循环）

- 构造时创建 `Scene / PerspectiveCamera / WebGLRenderer / OrbitControls`，默认**无阻尼**（鼠标释放即停）
- `setupLights`：环境光 + 方向光
- `GridHelper(40, 40)`：空场景方向感
- `start()`：requestAnimationFrame 循环，每帧 `controls.update()` → `render(scene, camera)` → `renderGizmo()`
- `fitToModel(obj, padding=0.2)`：**关键** —— `Box3.setFromObject` 计算包围盒，按 `fovV/fovH` 中较小者推出距离，让模型恰好填满视口；保留当前视角方向
- `setView(direction: 'front'|'left'|'top')`：把相机摆到正交标准视图方向，保留当前距离
- `renderGizmo()`：左上角画一个 XYZ 坐标系标记（AxesHelper + 圆锥箭头 + Sprite 文字），通过 `setViewport + setScissor` 隔离到 14% 区域；`syncGizmoCamera` 让 gizmo 跟随主相机方向旋转

### ModelLoader（GLB/OBJ 加载）

- `loadGLB(url)`：返回 `THREE.Group`，遍历 child 提取 `ifc_guid` / `point_ids` 到 userData
- DRACO 解码路径：`/draco/`

### PointManager（测点渲染 + 交互）

- `initPoints(visuals)`：每个测点 = Group({`Mesh` 球 + `Sprite` 名称}），球按 status 着色，名称 Sprite CanvasTexture 文字 + 半透明深色背板（深度测试关）
- `updatePoint(pointId, value, status)`：实时数据驱动颜色
- `hoverPoint(pointId | null)`：目标放大 1.6x + 切白色，其他还原；`mouseleave` 时取消
- `getPointByRay(raycaster)`：命中 mesh 反查 `pointId`

### Scene3D.vue（使用方）

- 接收 `props.modelId`，watch 触发 `loadModel`
- `loadModel` 内有 generation 计数（`loadGen`），快速切换项目时过期请求丢弃，objectURL 立即 revoke（避免 GLTFLoader 拿到已 revoke 的 blob）
- `loadModel` 成功后 `applyWhiteMaterial(currentModel)`：把所有 mesh 换成 `MeshLambertMaterial`（白模风格，便于看 PBR 之前的几何结构）
- 调 `sceneManager.fitToModel(currentModel)` 自适应视域
- `setupInteraction()`：click / mousemove / mouseleave 监听器，命中测点调 `dashboardStore.selectChannel(channelIds[0])`

### 数据流

```
buildSensorVisuals(sensors, channelIdsBySensor, latestData) → PointVisual[]
  ↓
dashboardStore.sensors → watch → setupSensors() → pointManager.initPoints(visuals)
  ↓
wsStore.latestData → watch → pointManager.updatePoint(sensorId, value, status)
```

`utils/three/sensorVisuals.ts` 里的 `buildSensorVisuals` 是抽出的纯函数：`tests/unit/sensorVisuals.test.ts` 覆盖 10 用例（过滤 position、timestamp 最新、quality 映射、name 回退、空数组边界）。

## 开发规范

- 组件使用组合式 API（`<script setup>`），**禁止 Options API**
- 类型定义优先使用 `interface`
- API 请求统一封装到 `api/` 目录，禁止直接 `axios.get` 散落在组件里
- 样式优先使用项目已有的 UI 组件库；自定义 CSS 用 SCSS + scoped
- WebSocket 事件统一通过 Pinia action 分发，禁止在组件里直接订阅
- Three.js 对象**禁止**进入 Vue `ref`/`reactive`（会触发大量依赖追踪）；纯 TS 类管理，Vue 组件仅持管理器引用
- 动画循环独立于 Vue 的 `requestAnimationFrame`，不进响应式
- 外部 event handler 引用用普通 `let storedXxx`，**不要**用 `Ref` 后缀命名然后调 `.value`

## JWT 处理流程

1. 用户登录 → 后端 `LoginResponse` 含 `user_id/username/email/role/is_active`，**直接读这些字段**，不要 `parseJwt`
2. 存 `access_token` 到 localStorage（生产建议 httpOnly cookie）；profile 单独存 `shm_user_profile`
3. Axios 请求拦截器：`Authorization: Bearer <access>`
4. 响应拦截器：遇到 401 → 调 `/auth/refresh` → 重试原请求
5. refresh 失败 → 清凭证 + 跳登录页
6. WebSocket 连接时把 access token 拼到 query：`ws://host/ws/data?token=<access>`

## API 契约规则（重要）

与后端 OpenAPI 严格对齐，参见 **`AGENTS.md` 第 7 节**：

- 响应信封 `Envelope<T> = { code, message, data, timestamp }`，业务错误 `data=null`
- 列表接口统一返回 `PageData<T> = { total, page, size, items }`，前端 `fetchAllPages` 拉全
- 强制 scope 的 list 接口：`/devices` 缺 `project_id`、`/sensors` 缺 `device_id`、`/channels` 缺 `sensor_id` 均返 422 `VALIDATION_ERROR`
- `AlertRule` 字段：`operator: 'gt'|'lt'|ge'|'le'|'eq'|'ne'`、`level: 'info'|'warning'|'danger'`、`suppress_seconds`（默认 60）
- `PlatformInfo.platform_name`（不是 `name`）
- `/data/ingest` 是设备侧 API Key（`X-API-Key`），**前端不调用**；只走 WSS
- 错误状态码：401 `AUTH_ERROR`、403 `FORBIDDEN`、404 `NOT_FOUND`、422 `VALIDATION_ERROR`/`EMPTY_UPDATE`、5xx `INTERNAL_ERROR`
- 权限中间件应先于资源查找（user 越权调不存在的资源仍返 403，不是 404）

任何后端契约变更后，本节与仓库根目录 `AGENTS.md` 必须同步更新。

## 测试

| 类型 | 命令 | 覆盖 |
| --- | --- | --- |
| 单元 | `pnpm test:unit` | `utils/three/sensorVisuals` 等纯函数 |
| API 契约 | `pnpm test:api` | `tests/api/` 99+ 用例，含 envelope / RBAC / 模型上传-转换-状态-下载链路 |
| E2E | `pnpm test:e2e` | Playwright 登录 → 大屏 → Admin → 登出 |

`pnpm test` = vitest run（含 unit + api）。`pnpm test:e2e` 单独跑 Playwright（webServer 自动启 vite dev，复用已有 5173）。

## 相关链接

- [开发环境](/developer/environment)
- [接口文档](/developer/api/)
- [后端模块](/developer/backend/)
- [代码规范](/developer/coding-standards)