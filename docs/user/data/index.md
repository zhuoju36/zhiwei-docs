# 数据采集与查看

止危的数据链路把边缘网关（采集协议）、云端接入（`/data/ingest`）、历史查询（`/data/timeseries`）、实时推送（WebSocket）四件事串成一条完整闭环。

## 功能概述

- 接收来自 MQTT、HTTP、Modbus TCP、Modbus RTU over TCP（DTU 透传）等协议的设备数据
- 按通道（channel）粒度写入 TimescaleDB hypertable，保留 7 天
- 历史查询按通道 + 时间范围 + 聚合粒度（`raw` / `1s` / `1m` / `1h` / `1d`）拉取
- 实时数据通过 Redis Pub/Sub 广播到 WebSocket 客户端
- 提供模拟数据功能，便于调试与演示

## 操作步骤

### 查看实时数据

1. 进入「数据查看」页面
2. 选择项目、设备、传感器、通道
3. 选择时间范围（最近 1 小时 / 今天 / 自定义）
4. 查看曲线与统计指标（最新值、最值、平均、RMS）

> 实时面板依赖 WebSocket；首次打开页面时浏览器会通过 `ws://<host>/ws/data?token=<JWT>` 订阅该项目频道。

### 查看历史曲线

1. 同上选择通道
2. 切换到「历史」模式
3. 设置时间范围与聚合粒度（`raw` 看原始波形，`1m` 看分钟级趋势）
4. 系统按需调用 `GET /api/v1/data/timeseries`，前端基于 ECharts 渲染

### 导出数据

1. 在数据查看页面设置好筛选条件
2. 点击「导出」按钮
3. 选择导出格式（CSV / Excel / JSON）
4. 确认导出（前端通过 `timeseries` 接口拉取原始数据再格式化）

### 模拟数据

1. 进入「模拟数据」页面
2. 选择目标通道
3. 设置采样频率、数据范围与持续时间
4. 点击「开始」——后端按节奏直接写入 `readings` hypertable，无需真实硬件

## 数据流概览

```
边缘网关 ──HTTP/MQTT──▶ POST /api/v1/data/ingest (X-API-Key)
                                  │
                  ┌───────────────┼───────────────┐
                  ▼               ▼               ▼
         TimescaleDB COPY    Redis SET       Redis PUBLISH
         readings hypertable latest:{id}    project:{id} 频道
                  │               │               │
                  ▼               ▼               ▼
        GET /data/timeseries  GET /data/latest  WebSocket 广播
        GET /data/latest      （毫秒级返回）    data:realtime
```

## 关键端点

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/v1/data/ingest` | `POST`（`X-API-Key`） | 边缘网关批量上报，1–10000 条/批 |
| `/api/v1/data/timeseries` | `GET`（JWT） | 历史曲线（`channel_id` + `start` + `end` + `interval`） |
| `/api/v1/data/latest/{channel_id}` | `GET`（JWT） | 某通道最新值（Redis 缓存） |
| `/ws/data` | WebSocket（JWT in query） | 实时推送（订阅项目频道） |

性能建议：

- 批次大小 1000–5000 条；过小增加 RTT，过大占用连接
- 多通道合并到同一 readings 数组（按 device / 时间戳分组）
- 高频场景建议边缘网关批量推送 + WebSocket 订阅，无需轮询

## 相关链接

- [传感器与通道](/user/sensor/)
- [告警规则](/user/alarm/)
- [报表与导出](/user/report/)
- [可视化看板](/user/dashboard/)