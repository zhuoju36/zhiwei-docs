# 项目

> 后端 v0.9 · 更新于 2026-08-18

管理结构健康监测中的「项目（project）」实体，配置 RBAC 数据隔离。项目下挂采集设备 → 传感器 → 通道。

只有 admin 能创建 / 修改 / 删除项目；普通用户只能读被授权的项目。

每个项目另有一份**前端三维视图设置**（`/projects/{id}/view-settings`），存储相机初始位置 / 朝向、网格 / 坐标轴 / 测点 marker 的可见性、画布背景色等。**懒创建**：GET 时若该项目从未保存过视图设置，返回 Pydantic 默认值且 `updated_at = null`（标识未落库）；PUT 整体替换 settings 并落库。所有项目成员看到同一份视图。

## 数据模型

```json
{
  "id": 1,
  "name": "演示项目",
  "description": "开发联调演示",
  "location": { "lat": 31.2, "lng": 121.5, "address": "..." },
  "model_file_key": "models/1/building.glb",
  "created_by": 1,
  "created_at": "2026-08-13T12:00:00Z"
}
```

`model_file_key` 当前保留为兼容字段，新版本请使用 [3D 模型](/developer/api/models) 多模型接口。

### 视图设置表 `project_view_settings`（项目级 1:1，懒创建）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `project_id` | INT PK + FK → projects CASCADE | 项目主键 |
| `settings` | JSONB NOT NULL DEFAULT `'{}'::jsonb` | 视图设置 blob，形状见 `ViewSettings` Pydantic schema |
| `updated_at` | TIMESTAMPTZ | 自动维护 |

`settings` 当前形状：

```json
{
  "camera": {
    "position": [0.0, 0.0, 10.0],
    "target":   [0.0, 0.0, 0.0],
    "up":       [0.0, 0.0, 1.0],
    "zoom": 1.0
  },
  "display": {
    "background_color": "#1a1a1a",
    "show_grid": true,
    "grid_size": 1.0,
    "show_axes": true,
    "show_sensor_markers": true
  }
}
```

字段约束：
- `camera.position / target / up`：3 元数组
- `camera.zoom`：> 0
- `display.background_color`：`#RRGGBB` 或 `#RRGGBBAA`
- `display.grid_size`：> 0，单位米

## 权限矩阵

| 接口 | admin | 普通用户 |
| --- | --- | --- |
| `GET /projects` 列表 | 全量 | 仅自己被授权的项目 |
| `GET /projects/{id}` | ✓ | 仅被授权项目 |
| `POST /projects` 创建 | ✓ | ✗ |
| `PUT /projects/{id}` 更新 | ✓ | ✗ |
| `DELETE /projects/{id}` 删除 | ✓ | ✗ |
| `POST /projects/{id}/users` 授权 | ✓ | ✗ |
| `GET /projects/{id}/view-settings` | ✓ | 仅被授权项目 |
| `PUT /projects/{id}/view-settings` | ✓ | 项目 write |

普通用户未授权访问时返回 `403 FORBIDDEN`。

---

## GET /api/v1/projects

分页列出可见项目。

### Query

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `page` | int | 1 | 页码（≥ 1） |
| `size` | int | 20 | 每页条数（1-200） |

### 响应 200

```json
{
  "code": "OK",
  "data": {
    "total": 1,
    "page": 1,
    "size": 20,
    "items": [
      { "id": 1, "name": "演示项目", "...": "..." }
    ]
  }
}
```

---

## POST /api/v1/projects

创建项目。需要 admin。

### 请求

```json
{
  "name": "南京长江大桥监测",
  "description": "二期扩建",
  "location": { "lat": 32.1, "lng": 118.8, "address": "..." }
}
```

字段约束：
- `name`：1-128 字符，必填
- `description`：可选
- `location`：可选 JSON 对象（建议含 lat/lng/address）

### 响应 201

```json
{
  "code": "OK",
  "data": { "id": 2, "name": "...", "...": "..." }
}
```

### 错误

| HTTP | code | 说明 |
| --- | --- | --- |
| 401 | `AUTH_ERROR` | 未登录 |
| 403 | `FORBIDDEN` | 非 admin |
| 422 | `VALIDATION_ERROR` | 字段校验失败 |

---

## GET /api/v1/projects/&#123;project_id&#125;

获取项目详情。需要登录且对项目有访问权限。

### 路径参数

- `project_id`：整数

### 响应 200

```json
{
  "code": "OK",
  "data": { "id": 1, "name": "...", "...": "..." }
}
```

### 错误

| HTTP | code | 说明 |
| --- | --- | --- |
| 403 | `FORBIDDEN` | 未被授权访问该 |
| 404 | `PROJECT_NOT_FOUND` | 不存在 |

---

## PUT /api/v1/projects/&#123;project_id&#125;

更新项目。需要 admin。

### 请求

所有字段可选（PATCH 语义，只更新传入字段）：

```json
{
  "name": "新名称",
  "description": "新描述",
  "location": { "lat": 32.1, "lng": 118.8 },
  "model_file_key": "models/1/building.glb"
}
```

### 响应 200

返回更新后的 `ProjectOut`。

---

## DELETE /api/v1/projects/&#123;project_id&#125;

删除项目（级联删除 user_projects / devices / sensors / project_view_settings）。需要 admin。

### 响应 204

无 body。

---

## POST /api/v1/projects/&#123;project_id&#125;/users

为项目授权用户，或更新已有授权的权限级别。需要 admin。

### 请求

```json
{
  "user_id": 5,
  "permission": "write"
}
```

| 字段 | 类型 | 必填 | 取值 |
| --- | --- | --- | --- |
| `user_id` | int | 是 | 目标用户 ID |
| `permission` | enum | 是 | `read` / `write` / `admin` |

幂等：已存在时更新 `permission`。

### 响应 204

无 body。

### 错误

| HTTP | code | 说明 |
| --- | --- | --- |
| 404 | `PROJECT_NOT_FOUND` / `USER_NOT_FOUND` | 项目或用户不存在 |

---

## 视图设置

### GET /api/v1/projects/&#123;project_id&#125;/view-settings

获取项目前端三维视图设置。**懒创建**：未保存过的项目返回 Pydantic 默认值且 `updated_at = null`。

**权限**：项目 read。

### 响应 200

```json
{
  "code": "OK",
  "data": {
    "camera": {
      "position": [0.0, 0.0, 10.0],
      "target":   [0.0, 0.0, 0.0],
      "up":       [0.0, 0.0, 1.0],
      "zoom": 1.0
    },
    "display": {
      "background_color": "#1a1a1a",
      "show_grid": true,
      "grid_size": 1.0,
      "show_axes": true,
      "show_sensor_markers": true
    },
    "project_id": 1,
    "updated_at": null
  }
}
```

### PUT /api/v1/projects/&#123;project_id&#125;/view-settings

整体替换项目视图设置（懒创建 — 行不存在则 INSERT，存在则 UPDATE 整 JSONB）。

**权限**：项目 write。

### 请求

```json
{
  "camera": {
    "position": [12.0, 8.0, 6.0],
    "target":   [0.0, 0.0, 0.0],
    "up":       [0.0, 0.0, 1.0],
    "zoom": 1.5
  },
  "display": {
    "background_color": "#0f1115",
    "show_grid": true,
    "grid_size": 2.0,
    "show_axes": false,
    "show_sensor_markers": true
  }
}
```

字段约束同上（参见 § 数据模型）。

### 响应 200

返回写入后的 `ViewSettingsOut`，`updated_at` 为落库后的时间戳。

---

## curl 示例

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -d 'username=admin&password=admin123456' | jq -r '.data.access_token')

# 创建
curl -X POST http://localhost:8000/api/v1/projects \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"name":"新项目","description":"测试"}'

# 列表
curl http://localhost:8000/api/v1/projects -H "Authorization: Bearer $TOKEN"

# 详情
curl http://localhost:8000/api/v1/projects/1 -H "Authorization: Bearer $TOKEN"

# 授权用户
curl -X POST http://localhost:8000/api/v1/projects/1/users \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"user_id":2,"permission":"read"}'

# 删除
curl -X DELETE http://localhost:8000/api/v1/projects/1 -H "Authorization: Bearer $TOKEN"

# 视图设置：GET 默认
curl http://localhost:8000/api/v1/projects/1/view-settings -H "Authorization: Bearer $TOKEN"

# 视图设置：PUT
curl -X PUT http://localhost:8000/api/v1/projects/1/view-settings \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"camera":{"position":[10,8,6]},"display":{"background_color":"#222"}}'
```

## 相关接口

- 项目内设备：[设备](/developer/api/devices)
- 项目内传感器：[传感器](/developer/api/sensors)
- 项目级通知：[通知](/developer/api/notifications)
- 项目内 3D 模型：[3D 模型](/developer/api/models)