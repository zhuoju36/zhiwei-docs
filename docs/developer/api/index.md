# 接口文档

止危后端提供 RESTful API，所有接口遵循统一的请求与响应规范（详见后端 [`docs/api/overview.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/overview.md)）。

## 接口规范

- **基础路径**：`/api/v1`
- **请求格式**：`application/json`（登录用 `application/x-www-form-urlencoded`）
- **用户鉴权**：`Authorization: Bearer <access_token>`（access 15min + refresh 7d）
- **边缘网关鉴权**：`X-API-Key: <EDGE_API_KEY>`（仅 `POST /data/ingest`）
- **响应格式**：

```json
{
  "code": "OK",
  "message": "success",
  "data": {},
  "timestamp": "2026-08-14T12:34:56.789+00:00"
}
```

错误响应同结构，`code` 为具体错误码（如 `AUTH_ERROR` / `FORBIDDEN` / `PROJECT_NOT_FOUND`）。

## 接口分类

| 分类 | 路径前缀 | 主要功能 |
| --- | --- | --- |
| 认证 | `/api/v1/auth` | OAuth2 Password Flow 登录、refresh token 续期 |
| 项目 | `/api/v1/projects` | 项目 CRUD + 用户授权 |
| 设备 | `/api/v1/devices` | 设备 CRUD（绑定协议） |
| 传感器 | `/api/v1/sensors` | 传感器 CRUD（位置 + 仪器元数据） |
| 通道 | `/api/v1/channels` | 通道 CRUD（单位 / 采样率 / 告警规则） |
| 协议 | `/api/v1/protocols` | 协议元数据列表 + 各协议 config schema |
| 时序数据 | `/api/v1/data` | ingest / timeseries / latest |
| 告警 | `/api/v1/alerts` | 列表 / 详情 / 确认 |
| 大屏 | `/api/v1/dashboard` | 聚合统计 + 最近告警 |
| 分析 | `/api/v1/analysis` | 任务提交 / 查询 / NPZ 下载 |
| 模型 | `/api/v1/models` | 3D 模型上传 / 转换 / 下载 |
| 通知 | `/api/v1/notifications` | Webhook / Email 通道配置 |
| 用户 | `/api/v1/users` | admin 用户管理 |
| 平台 | `/api/v1/platform` | 平台元数据 |
| 首次部署 | `/api/v1/setup` | 创建首个 admin（仅 `users` 为空时开放） |
| WebSocket | `/ws/data` | 实时推送（JWT in query） |

## 完整参考

详细的字段说明、请求 / 响应示例、错误码请参见后端文档：

- [`shm-backend/docs/api/overview.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/overview.md) — 鉴权 / 错误码 / 分页 / 时间格式
- [`shm-backend/docs/api/auth.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/auth.md) — 登录 / refresh
- [`shm-backend/docs/api/projects.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/projects.md) — 项目 + 授权
- [`shm-backend/docs/api/devices.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/devices.md) — 设备
- [`shm-backend/docs/api/sensors.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/sensors.md) — 传感器
- [`shm-backend/docs/api/channels.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/channels.md) — 通道
- [`shm-backend/docs/api/protocols.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/protocols.md) — 协议元数据
- [`shm-backend/docs/api/data.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/data.md) — 时序数据 + WebSocket
- [`shm-backend/docs/api/alerts.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/alerts.md) — 告警
- [`shm-backend/docs/api/analysis.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/analysis.md) — 分析任务
- [`shm-backend/docs/api/models.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/models.md) — 3D 模型
- [`shm-backend/docs/api/setup.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/setup.md) — 首次部署引导

## OpenAPI 实时文档

启动后端服务后可访问：

```
http://localhost:8000/docs      # Swagger UI（推荐）
http://localhost:8000/redoc     # ReDoc
```

`/docs` 上的「Try it out」可直接对每个端点发起请求。

## 鉴权流程速览

1. `POST /api/v1/auth/login`（OAuth2 Password Flow）→ 拿 access + refresh token
2. 后续请求 `Authorization: Bearer <access_token>`
3. access 过期（15min）→ 客户端拦截 401，先用 refresh 调 `/auth/refresh`，再重试原请求
4. refresh 失败再清除本地凭证跳登录页

边缘网关跳过 JWT 流程，直接 `X-API-Key` 调 `POST /data/ingest`。

## 相关链接

- [后端模块](/developer/backend/)
- [前端模块](/developer/frontend/)
- [数据模型](/developer/database/)