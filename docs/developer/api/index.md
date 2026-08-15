# 接口概览

> 后端 v0.9 · 更新于 2026-08-16

止危后端对外暴露 **RESTful API** 与 **WebSocket** 两类接口，本章给出完整参考。所有接口路径前缀 `/api/v1`；Swagger UI 实时文档在部署后访问 `http://<host>/docs`，ReDoc 在 `http://<host>/redoc`。

## 接口分类

| 分类 | 路径前缀 | 主要功能 |
| --- | --- | --- |
| [认证](/developer/api/auth) | `/api/v1/auth` | OAuth2 Password Flow 登录、refresh token 续期 |
| [用户](/developer/api/users) | `/api/v1/users` | admin 用户 CRUD + 密码重置 |
| [首次部署](/developer/api/setup) | `/api/v1/setup` | 创建首个 admin（仅 `users` 为空时开放） |
| [平台元数据](/developer/api/platform) | `/api/v1/platform` | 平台名称 / Logo / 联系邮箱（GET 公开，PUT 需 admin） |
| [项目](/developer/api/projects) | `/api/v1/projects` | 项目 CRUD + 用户授权 |
| [设备](/developer/api/devices) | `/api/v1/devices` | 设备 CRUD（绑定协议） |
| [传感器](/developer/api/sensors) | `/api/v1/sensors` | 传感器 CRUD（位置 + 仪器元数据） |
| [通道](/developer/api/channels) | `/api/v1/channels` | 通道 CRUD（单位 / 采样率 / 告警规则） |
| [协议](/developer/api/protocols) | `/api/v1/protocols` | 协议元数据列表 + 各协议 config schema |
| [时序数据](/developer/api/data) | `/api/v1/data` + `/ws/data` | ingest / timeseries / latest + WebSocket 实时推送 |
| [告警](/developer/api/alerts) | `/api/v1/alerts` | 列表 / 详情 / 确认 |
| [分析](/developer/api/analysis) | `/api/v1/analysis` | 任务提交 / 查询 / NPZ 下载 |
| [模型](/developer/api/models) | `/api/v1/models` | 3D 模型上传 / 转换 / 下载 |
| [大屏](/developer/api/dashboard) | `/api/v1/dashboard` | 聚合统计 + 最近告警 |
| [通知](/developer/api/notifications) | —（事件驱动） | Webhook / Email 通道配置与 Payload |

## 统一响应结构

所有成功响应都包在 `EnvelopeMiddleware` 中：

```json
{
  "code": "OK",
  "message": "success",
  "data": { ... },
  "timestamp": "2026-08-13T12:34:56.789+00:00"
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | string | 业务码；成功为 `OK`，错误见下表 |
| `message` | string | 人类可读的说明 |
| `data` | any / null | 实际载荷；失败时为 `null` |
| `timestamp` | string (ISO8601) | 服务器响应时间（UTC） |

## 错误码与 HTTP 状态

| HTTP | 业务 code | 含义 | 触发场景 |
| --- | --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 入参校验失败 | Pydantic Field 约束不满足 |
| 400 | `MODEL_FORMAT_UNSUPPORTED` / `MODEL_EMPTY` | 模型文件不合法 | 扩展名不在白名单或空文件 |
| 401 | `AUTH_ERROR` | 未认证 / 凭证无效 | 缺失或过期 token、密码错误、API Key 错误 |
| 403 | `FORBIDDEN` | 已认证但无权限 | 非 admin 调用 admin-only 接口、非授权用户访问项目 |
| 404 | `*_NOT_FOUND` | 资源不存在 | 路径 ID 无效（`PROJECT_NOT_FOUND` / `DEVICE_NOT_FOUND` / `CHANNEL_NOT_FOUND` / `USER_NOT_FOUND` / `ALERT_NOT_FOUND` / `ANALYSIS_JOB_NOT_FOUND` 等） |
| 409 | `USER_EXISTS` / `EMAIL_EXISTS` / `DEVICE_CODE_EXISTS` / `SENSOR_CODE_EXISTS` / `CHANNEL_CODE_EXISTS` / `ALERT_ALREADY_RESOLVED` / `SELF_PROTECTED` / `LAST_ADMIN` | 资源冲突 | 唯一键冲突或守卫触发 |
| 413 | `MODEL_TOO_LARGE` | 请求体过大 | 模型文件超过 200MB |
| 422 | `VALIDATION_ERROR` | 请求体验证失败 | 字段类型错误、必填缺失 |
| 422 | `WEAK_PASSWORD` / `EMPTY_UPDATE` | 业务规则不满足 | 密码策略失败 / PUT 请求体为空 |
| 422 | `PROTOCOL_NOT_REGISTERED` / `PLUGIN_NOT_REGISTERED` | 名称未注册 | 协议 / 插件名不在注册表 |
| 500 | `INTERNAL_ERROR` | 未捕获异常 | 服务端 bug |
| 503 | `AGGREGATE_NOT_READY` | 连续聚合未初始化 | 调用 `timeseries?interval>=1m` 但未执行 `init_db.py` |

错误响应同样使用统一信封（`code` 为具体错误码，`message` 为说明，`data` 为 `null`）。`VALIDATION_ERROR` 的 `message` 字段会包含详细错误数组。

## 鉴权机制

### 用户端：JWT Bearer

```http
Authorization: Bearer <access_token>
```

- access token 默认 15 分钟有效（`ACCESS_TOKEN_EXPIRE_MINUTES`）
- refresh token 默认 7 天有效，用于换取新令牌
- 过期或无效时返回 `401 AUTH_ERROR`
- 完整流程见 [认证](/developer/api/auth)

### 边缘网关：API Key

```http
X-API-Key: <edge_api_key>
```

- 仅用于 `POST /api/v1/data/ingest`（详见 [时序数据](/developer/api/data)）
- 配置项：`EDGE_API_KEY`（默认 `edge-secret-key`，生产必须替换）
- 缺失或错误时返回 `401 AUTH_ERROR`

### WebSocket：JWT in query

```
ws://<host>/ws/data?token=<access_token>
```

- 客户端在订阅项目频道前必须先建立连接并发送 `cmd:subscribe`
- 服务端订阅前校验 `check_project_access`，失败返回 `cmd:error` + close code `4403`
- 完整协议见 [时序数据 § WebSocket](/developer/api/data#ws-wsdata)

## 分页约定

列表接口接受 `page` 与 `size`：

| 参数 | 类型 | 默认 | 约束 |
| --- | --- | --- | --- |
| `page` | int | 1 | ≥ 1 |
| `size` | int | 20 | 1 ≤ size ≤ 200 |

分页响应：

```json
{
  "code": "OK",
  "data": {
    "total": 123,
    "page": 1,
    "size": 20,
    "items": [ ... ]
  }
}
```

## 时间格式

所有时间字段均为 ISO 8601 带时区（UTC）：

```
2026-08-13T12:34:56.789+00:00
```

请求时也必须使用同一格式（带 `Z` 或 `+00:00`），FastAPI 自动解析。

## 限流

v0.9 未实现应用层限流。生产建议在 Nginx 或 API Gateway 层加 IP 维度的限流，特别是 `/data/ingest`（防止边缘网关异常导致雪崩）。

## 版本与变更

| 后端版本 | 文档更新 | 主要变化 |
| --- | --- | --- |
| v0.9 | 2026-08-13 | 六层拓扑（user → project → device → sensor → channel → readings）落地，传感器 = 测点合一，移除 `point_code` 概念 |
| v0.8 | — | 引入 channel 概念，告警规则下沉到 channel |
| v0.7 | — | 引入平台元数据 + setup 端点 |

后端仓库 [`shm-backend/docs/api/`](https://github.com/zhuoju36/zhiwei-backend/tree/main/docs/api/) 保留权威源；本文档与之同步维护。