# 设备

> 后端 v0.9 · 更新于 2026-08-16

管理项目内的硬件网关 / 采集设备。每个设备绑定一种协议，通过 `devices.protocol` 字段匹配 `app/plugins/protocols/` 中注册的 `ProtocolAdapter`。中央采集场景下协议插件运行在后端进程内；边缘采集场景下协议由独立 [数据采集器](/developer/collector/) 处理，通过 `POST /data/ingest` 上报。

## 数据模型

```json
{
  "id": 1,
  "project_id": 1,
  "device_code": "GW-001",
  "device_name": "演示网关",
  "protocol": "http_json",
  "config": { "host": "http://...", "port": 9000 },
  "status": "online",
  "last_seen": "2026-08-13T12:00:00Z",
  "note": null,
  "created_at": "2026-08-13T11:00:00Z"
}
```

`device_code` 全局唯一（不限于项目）；`config` 是协议相关的 JSONB，由前端按所选协议的 schema 提供。

## 权限

| 操作 | admin | 项目 admin | 项目 write | 项目 read | 其他 |
| --- | --- | --- | --- | --- | --- |
| `GET /devices`（列表） | ✓ | ✓ | ✓ | ✓ | ✗ |
| `GET /devices/{id}` | ✓ | ✓ | ✓ | ✓ | ✗ |
| `POST /devices` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `PUT /devices/{id}` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `DELETE /devices/{id}` | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## GET /api/v1/devices

按项目分页列出设备。

### Query

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `project_id` | 是 | 项目 ID |
| `page` / `size` | 否 | 分页参数 |

### 响应 200

```json
{
  "code": "OK",
  "data": {
    "total": 3,
    "page": 1,
    "size": 20,
    "items": [ ... ]
  }
}
```

### 错误

| HTTP | code | 说明 |
| --- | --- | --- |
| 403 | `FORBIDDEN` | 未被授权访问该项目 |

---

## POST /api/v1/devices

创建设备。

### 请求

```json
{
  "project_id": 1,
  "device_code": "GW-002",
  "device_name": "南门网关",
  "protocol": "http_json",
  "config": { "host": "http://10.0.0.2", "port": 9000 }
}
```

字段约束：
- `project_id`：必填且项目必须存在
- `device_code`：1-64 字符，全局唯一
- `protocol`：必须已注册到 `AdapterRegistry.names()`（参见 [协议元数据](/developer/api/protocols)）；v0.9 注册的有 `http_json` / `mqtt` / `modbus_tcp` / `modbus_rtu_over_tcp`
- `config`：协议配置 JSONB，schema 由前端按所选协议决定

### 响应 201

返回 `DeviceOut`。

### 错误

| HTTP | code | 说明 |
| --- | --- | --- |
| 403 | `FORBIDDEN` | 无项目写权限 |
| 404 | `PROJECT_NOT_FOUND` | 项目不存在 |
| 409 | `DEVICE_CODE_EXISTS` | device_code 已被占用 |

---

## GET /api/v1/devices/&#123;device_id&#125;

获取设备详情。

### 响应 200

返回 `DeviceOut`。

### 错误

| HTTP | code | 说明 |
| --- | --- | --- |
| 403 | `FORBIDDEN` | 未被授权访问所属项目 |
| 404 | `DEVICE_NOT_FOUND` | 设备不存在 |

---

## PUT /api/v1/devices/&#123;device_id&#125;

更新设备字段。所有字段可选（PATCH 语义）。

### 请求

```json
{ "device_name": "新名称", "config": { "host": "http://..." } }
```

### 响应 200

返回更新后的 `DeviceOut`。

---

## DELETE /api/v1/devices/&#123;device_id&#125;

删除设备。需要 admin（级联删除其下传感器与通道）。

### 响应 204

无 body。

---

## curl 示例

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -d 'username=admin&password=admin123456' | jq -r '.data.access_token')

# 列表
curl -G http://localhost:8000/api/v1/devices \
    -H "Authorization: Bearer $TOKEN" --data-urlencode "project_id=1"

# 创建
curl -X POST http://localhost:8000/api/v1/devices \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"project_id":1,"device_code":"GW-002","protocol":"http_json","config":{"host":"http://x"}}'
```

## 相关接口

- 协议元数据：[协议](/developer/api/protocols)
- 设备下的传感器：[传感器](/developer/api/sensors)
- 设备采集上报的时序数据：[时序数据](/developer/api/data)
- 自带协议适配的边缘采集进程：[数据采集器](/developer/collector/)