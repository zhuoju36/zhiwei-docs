# 3D 模型

> 后端 v0.9 · 更新于 2026-08-18

项目（project）的 3D 模型管理：上传源模型（OBJ/STL/PLY/glTF/GLB）→ Celery `reports` 队列后台转换为 **GLB**（前端数字孪生加载格式）→ 按需下载。**一个项目可拥有多个模型**，每条记录独立转换、下载与删除。

每个模型额外带 4 个**视图变换字段**（`display_color / translation / rotation / scale`），供前端画布控制模型的位置、姿态、缩放与默认填充色。`PATCH /models/{id}/transform` 部分更新这 4 个字段。

## 数据模型

```json
{
  "id": 1,
  "project_id": 1,
  "original_name": "tower.obj",
  "source_format": "obj",
  "glb_key": "models/1/9f2c….glb",
  "status": "success",
  "error": null,
  "note": null,
  "display_color": "#3388ff",
  "translation": [0.0, 0.0, 0.0],
  "rotation":    [0.0, 0.0, 0.0, 1.0],
  "scale":       [1.0, 1.0, 1.0],
  "created_at": "2026-08-14T10:00:00Z",
  "finished_at": "2026-08-14T10:00:01.500Z"
}
```

`status` 流转：`pending → processing → success` 或 `pending → processing → failed`。

**视图变换字段语义**（与 glTF / Three.js `node` 一致）：

| 字段 | 类型 | 默认（identity） | 含义 |
| --- | --- | --- | --- |
| `display_color` | `#RRGGBB[AA]` | `#CCCCCC` | 加载时画布填充色 |
| `translation`  | JSONB 数组，3 元 | `[0, 0, 0]`     | 平移向量 `[tx, ty, tz]` |
| `rotation`     | JSONB 数组，4 元 | `[0, 0, 0, 1]`  | 四元数 `(x, y, z, w)`，避免万向锁 |
| `scale`        | JSONB 数组，3 元 | `[1, 1, 1]`     | 三轴缩放 |

新建模型自动填默认 identity；迁移脚本对已存行回填单位变换。

## 权限

| 操作 | admin | 项目 write | 项目 read | 其他 |
| --- | --- | --- | --- | --- |
| `POST /models/{project_id}/upload`（上传） | ✓ | ✓ | ✗ | ✗ |
| `GET /models`（列表） | ✓ | ✓ | ✓ | ✗ |
| `GET /models/{id}`（详情） | ✓ | ✓ | ✓ | ✗ |
| `GET /models/{id}/file`（下载 GLB） | ✓ | ✓ | ✓ | ✗ |
| `PATCH /models/{id}/transform`（视图变换） | ✓ | ✓ | ✗ | ✗ |
| `DELETE /models/{id}`（删除） | ✓ | ✗ | ✗ | ✗ |

---

## POST `POST /api/v1/models/{project_id}/upload`

上传源模型文件（`multipart/form-data`，字段名 `file`），触发后台转换任务。

**权限**：项目 write。

**请求**：

```http
POST /api/v1/models/1/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file: tower.obj (application/octet-stream)
```

**成功 201**：

```json
{
  "code": "OK",
  "message": "success",
  "data": { "model_id": 3, "status": "pending" },
  "timestamp": "2026-08-14T10:00:00Z"
}
```

**约束**：
- 格式白名单：`.obj` / `.stl` / `.ply` / `.gltf` / `.glb`
- 文件 ≤ 200MB
- **IFC 暂不支持**（需 v0.9+ Blender/IfcOpenShell 转换器），返回 `MODEL_FORMAT_UNSUPPORTED`

**错误**：

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `MODEL_FORMAT_UNSUPPORTED` | 扩展名不在白名单（含 .ifc） |
| 400 | `MODEL_EMPTY` | 空文件 |
| 404 | `PROJECT_NOT_FOUND` | 项目不存在 |
| 413 | `MODEL_TOO_LARGE` | 超过 200MB |

---

## GET 列表（按 project_id）

按项目分页列出模型（一个项目多个模型）。

**权限**：项目 read。

**查询参数**：`project_id`（必填）、`page`、`size`。

**成功 200**：items 中每条形如上文"数据模型"。

---

## GET 详情 `GET /api/v1/models/{id}`

模型详情（含当前转换状态、错误信息、视图变换）。**权限**：项目 read。

---

## GET 下载 GLB `GET /api/v1/models/{id}/file`

下载转换后的 **GLB** 文件（`Content-Type: model/gltf-binary`，`Content-Disposition: attachment`）。

**权限**：项目 read。

**错误**：`409 MODEL_NOT_READY` — 模型尚未转换完成（`status != success`）。

---

## PATCH `PATCH /api/v1/models/{id}/transform`

部分更新模型在视图中的 4 个变换字段。**权限**：项目 write。

**请求**：所有字段均可选，仅更新请求体中实际出现的键（其它字段保持原值）。

```json
{
  "display_color": "#3388ff",
  "translation": [10.0, 0.0, 5.0],
  "rotation":    [0.0, 0.0, 0.0, 1.0],
  "scale":       [1.0, 1.0, 1.0]
}
```

字段约束：
- `display_color`：`#RRGGBB` 或 `#RRGGBBAA`，≤ 9 字符
- `translation`：3 元数组
- `rotation`：4 元数组（四元数 `(x, y, z, w)`）
- `scale`：3 元数组

**响应 200**：返回完整 `ModelOut`。

**错误**：

| HTTP | code | 场景 |
| --- | --- | --- |
| 403 | `FORBIDDEN` | 无项目写权限 |
| 404 | `MODEL_NOT_FOUND` | 模型不存在 |
| 422 | `VALIDATION_ERROR` | 字段格式 / 长度不合规 |

---

## DELETE `DELETE /api/v1/models/{id}`

删除模型记录，并清理 MinIO 中的源文件与 GLB 产物（清理失败仅记日志，不影响删除）。

**权限**：admin。**成功 204**；不存在 404。

## 相关接口

- 模型所属项目：[项目](/developer/api/projects)
- 项目级画布视图设置：[项目 § 视图设置](/developer/api/projects#视图设置)
- 传感器 3D 大屏定位：[传感器 § position](/developer/api/sensors)