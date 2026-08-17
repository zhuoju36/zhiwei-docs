# 大屏

> 后端 v0.9 · 更新于 2026-08-16

为前端数字孪生大屏提供的轻量聚合统计接口。复杂图表由前端基于 [时序数据](/developer/api/data) 的时序查询自行组装。

---

## GET /api/v1/dashboard/stats

聚合统计：活跃告警数、近 24h 告警数、按级别分布。

### Query

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `project_id` | 否 | 不传 → 全局统计（仅 admin 可见）；传 → 限该项目 |

### 响应 200

```json
{
  "code": "OK",
  "data": {
    "active_alerts": 5,
    "alerts_24h": 23,
    "by_level": {
      "info": 1,
      "warning": 3,
      "danger": 1
    },
    "project_id": 1
  }
}
```

| 字段 | 说明 |
| --- | --- |
| `active_alerts` | `is_resolved=false` 的告警数 |
| `alerts_24h` | `started_at >= now() - 24h` 的告警数（含已恢复） |
| `by_level` | 当前活跃告警按 level 分组计数（仅包含数据库中实际出现的 level） |
| `project_id` | 回显查询参数 |

### 错误

| HTTP | code | 说明 |
| --- | --- | --- |
| 403 | `FORBIDDEN` | 非项目成员 |

---

## GET /api/v1/dashboard/recent-alerts

按时间倒序获取最近 N 条告警（不论已恢复/未恢复）。

### Query

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `project_id` | — | 可选 |
| `limit` | 10 | 1-200 |

### 响应 200

```json
{
  "code": "OK",
  "data": [
    { "id": 23, "point_id": 1, "level": "danger", "started_at": "...", "is_resolved": false, "...": "..." }
  ]
}
```

数组元素结构与 `/alerts` 列表项一致（见 [告警](/developer/api/alerts)）。

> 注：载荷中的 `point_id` 是后端早期命名（兼容保留），当前 v0.9 实际指向 `channel_id`。

---

## GET /api/v1/dashboard/overview

项目地图聚合接口：一次返回所有可见项目的元信息 + 设备状态分布，供前端「项目地图」散点 + 浮窗展示。

- 权限模型与 `GET /projects` 完全一致：admin 全量；普通用户仅返回 `user_projects` 中授权项目
- 不分页、不接受过滤参数
- `location=null` 的项目**仍出现**（前端用表格兜底渲染）
- `device_stats.total` 严格等于 `online + offline + error` 之和；未知 status 归入 `offline` 桶

### 响应 200

```json
{
  "code": "OK",
  "data": {
    "projects": [
      {
        "id": 1,
        "name": "钱塘江大桥监测",
        "description": "主桥结构健康监测",
        "location": {
          "lat": 30.198,
          "lng": 120.215,
          "address": "浙江省杭州市钱塘江大桥"
        },
        "device_stats": { "total": 12, "online": 10, "offline": 1, "error": 1 }
      }
    ]
  }
}
```

---

## curl 示例

```bash
curl -G http://localhost:8000/api/v1/dashboard/stats \
    -H "Authorization: Bearer $TOKEN" --data-urlencode "project_id=1"

curl -G http://localhost:8000/api/v1/dashboard/recent-alerts \
    -H "Authorization: Bearer $TOKEN" \
    --data-urlencode "project_id=1" --data-urlencode "limit=20"
```

## 相关接口

- 告警明细：[告警](/developer/api/alerts)
- 时序曲线：[时序数据](/developer/api/data)
- 大屏用 3D 数字孪生：[3D 模型](/developer/api/models)