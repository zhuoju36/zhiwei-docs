# 告警规则

告警是按 **通道（channel）** 配置的：每个通道可以挂一组阈值规则，由 Celery `alerts` 队列在边缘网关上报读数后异步评估；触发后写入 `alerts` 表，并通过 WebSocket 推送到前端。

## 功能概述

- 在通道上配置阈值规则（`alert_rules` JSON 数组）
- 支持多级告警（`info` / `warning` / `danger`）
- 支持告警抑制窗口（`suppress_seconds`，默认 60 秒）
- 自动恢复：当读数回到正常范围时自动关闭告警
- 通知渠道：Webhook、Email（全局配置，规划按项目配置）
- 实时推送：通过 WebSocket `data:alert` 事件推送告警

## 告警规则定义

挂在通道（channel）上的 `alert_rules` 是 JSON 数组：

```json
[
  {
    "operator": "gt",
    "threshold": 0.5,
    "level": "warning",
    "message": "X 轴加速度超 0.5 m/s²",
    "suppress_seconds": 60
  },
  {
    "operator": "lt",
    "threshold": -0.3,
    "level": "warning"
  }
]
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `operator` | enum | `gt` / `lt` / `ge` / `le` / `eq` / `ne` |
| `threshold` | number | 阈值数值 |
| `level` | enum | `info` / `warning` / `danger` |
| `message` | string? | 自定义文案（默认按规则生成） |
| `suppress_seconds` | number? | 同 `(channel_id, level)` 抑制窗口，默认 60s |

## 评估与生命周期

1. 边缘网关上报 → `POST /data/ingest`
2. Celery `alerts` 队列消费，遍历涉及的通道
3. 对每条规则评估读数：
   - 命中且 `(channel_id, level)` 无活跃告警 → 创建新告警
   - 命中且已有未恢复告警 → 刷新 `value` / `threshold`
   - 不命中且已有未恢复告警 → 自动恢复（`is_resolved=true`、`ended_at=now()`）
4. 任何状态变更都通过 Redis Pub/Sub `project:{id}` 频道广播，前端 WebSocket 收到 `data:alert` 事件

## 操作步骤

### 在通道上配置告警规则

1. 进入「传感器管理」→ 目标传感器 → 「通道」标签
2. 编辑目标通道的 `alert_rules` JSON 数组
3. 保存

### 查看告警事件

1. 进入「告警中心」
2. 按项目 / 通道 / 等级 / 状态（未处理 / 已恢复）筛选
3. 点击事件查看详情（触发时间、当前值、阈值、规则详情）

### 处理告警

1. 在告警详情页点击「确认」
2. 系统记录 `resolved_by` 与 `ended_at`，状态变为已恢复

> 只有项目 `admin` 角色可以确认告警。

## API 入口

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/v1/alerts?project_id=&channel_id=` | `GET` | 分页列出告警 |
| `/api/v1/alerts/{id}` | `GET` | 告警详情 |
| `/api/v1/alerts/{id}/acknowledge` | `POST` | 人工确认 |
| `/api/v1/dashboard/stats` | `GET` | 聚合统计（活跃告警数、按级别分布） |
| `/api/v1/dashboard/recent-alerts` | `GET` | 最近 N 条告警 |

## 相关链接

- [数据采集与查看](/user/data/)
- [传感器与通道](/user/sensor/)
- [可视化看板](/user/dashboard/)