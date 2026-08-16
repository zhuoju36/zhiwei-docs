# 数据采集器（shm-collector）

`shm-collector` 是止危的**独立数据采集进程**，与 FastAPI 主进程解耦。负责协议适配、本地缓存与标准化，把现场设备数据按统一 `readings` 报文通过 `POST /api/v1/data/ingest`（`X-API-Key`）上报到后端。

> v0.9 期间 collector 与后端共进程（协议插件收在 `app/plugins/protocols/`）；**v1.0 起重新独立**，作为可选的边缘采集进程部署。**长期方向（v2 远期）**：把协议适配器从后端完全解耦出去，统一由 collector（或独立适配器包）承载，后端只保留 `POST /api/v1/data/ingest` 接入端点——届时「中央采集」模式要么经 collector 转发实现，要么仅保留 HTTP JSON 这类无需适配器代码的协议。

## 何时使用

两种采集位置功能等价，按场景二选一：

| 场景 | 中央采集 | 边缘采集（`shm-collector`） |
| --- | --- | --- |
| 设备可直接访问云端（MQTT / HTTP / DTU 透传） | ✅ 推荐 | 过度 |
| 设备在内网 / 防火墙后 | 需开端口 | ✅ 推荐 |
| 现场需要协议本地聚合 / 降采样 | 不支持 | ✅ 推荐 |
| 需要断网续传 | 不可用 | ✅ 推荐 |
| 需要独立升级协议适配器 | 拖整后端重启 | ✅ 仅 collector 重启 |
| 单设备 / 调试 / 演示 | ✅ 简单 | 过度 |

简单判断：**只要数据到达云端前还要经过一道边缘节点，就用 collector**。

## 架构位置

```
现场设备 ──Modbus / MQTT / OPC-UA / 自定义──▶ shm-collector（独立进程）
                                                │
                                                │  标准化为 readings 数组
                                                │  （device_code + channel_code + …）
                                                ▼
                                       HTTP POST /api/v1/data/ingest
                                                │  X-API-Key: <EDGE_API_KEY>
                                                ▼
                                       FastAPI 后端
                                                │
                                                ▼
                                TimescaleDB ◀── Redis ◀── Celery
                                       readin   latest /  alerts / analysis
                                       hypertable  Pub/Sub  queues
```

下游（Redis 缓存 / TimescaleDB 入库 / Celery 告警与任务 / WebSocket 实时推送）**完全复用**——对它们而言，无论 readings 来自后端协议插件还是 collector，行为完全一致。

## 数据契约

Collector 输出与后端 `POST /api/v1/data/ingest` 完全一致的标准 `readings` 数组：

```json
{
  "readings": [
    {
      "device_code": "GW-MOD-001",
      "channel_code": "ACC-X",
      "timestamp": "2026-08-15T12:34:56.789+00:00",
      "value": 0.0234,
      "unit": "m/s2",
      "quality": "good",
      "extra": { "raw_status": "ok" }
    }
  ]
}
```

字段约定见 [接入协议](/developer/protocol/#标准上报报文)。

鉴权与请求：

```
POST /api/v1/data/ingest
X-API-Key: <EDGE_API_KEY>      # 与后端 .env 的 EDGE_API_KEY 一致
Content-Type: application/json
```

性能建议：

- 批次 1000–5000 条 / 推送
- 多通道合并到同一 `readings` 数组
- 失败重试：HTTP 5xx 与网络错误按指数退避重试（默认 3 次），4xx 立即丢弃并记错误日志

## 配置（TOML 草案）

```toml
[server]
backend_url = "https://shm.example.com"   # 走到后端 /api/v1/data/ingest 的 base URL
api_key = "same-EDGE_API_KEY-as-backend"  # 与后端 .env 的 EDGE_API_KEY 一致
batch_size = 2000                          # 单次推送 readings 条数
flush_interval_ms = 1000                   # 攒批最大等待时间
request_timeout_ms = 10000
retry_max = 3
retry_backoff_ms = 1000

[cache]
backend = "sqlite"                         # 断网缓存后端：sqlite / memory
path = "/var/lib/shm-collector/buffer.db"
max_size_bytes = 1073741824                 # 1 GiB 软上限

[log]
level = "INFO"                             # DEBUG / INFO / WARNING / ERROR
format = "json"                            # json / text

[metrics]
enabled = true                             # 暴露 /metrics（Prometheus 格式）
port = 9090

# ──────── 设备清单 ────────
[[devices]]
device_code = "GW-MOD-001"                 # 必须与后端 devices.device_code 一致
protocol = "modbus_tcp"
enabled = true

[devices.config]
host = "10.0.0.10"
port = 502
slave_id = 1
sample_interval_ms = 1000

[[devices.channels]]
channel_code = "ACC-X"
unit = "m/s2"
scale = 0.001
data_type = "float32"

[[devices.channels]]
channel_code = "TEMP"
unit = "°C"
scale = 0.1
data_type = "int16"

[[devices]]
device_code = "GW-MQTT-01"
protocol = "mqtt"
enabled = true

[devices.config]
host = "broker.local"
port = 1883
username = "edge"
password = "secret"
topic = "shm/+/+/value"
use_tls = false
```

### 配置加载

```
shm-collector --config /etc/shm-collector/config.toml
```

环境变量覆盖：`SHM_COLLECTOR__SERVER__API_KEY` 等（双下划线层级分隔），优先级高于 TOML。

## 协议适配器（自带）

Collector 自带一套协议适配器，**与 `shm-backend/app/plugins/protocols/` 平行**：

- 同一协议在两端各有一份实现，接口签名一致但代码独立
- 通过 `pkgutil` 启动时扫描 `shm_collector/plugins/protocols/` 自动注册
- 已知实现：HTTP JSON / MQTT / Modbus TCP / Modbus RTU over TCP（DTU 透传）
- 监听型适配器（DTU 等）：`supports_listen = True` + `decode_stream`，无需 `connect` 语义

抽象接口（**禁止修改**）：

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import List


@dataclass
class RawReading:
    device_code: str
    channel_code: str
    timestamp: datetime
    value: float
    unit: str
    quality: str = "good"
    raw_bytes: bytes = b""


class ProtocolAdapter(ABC):
    name: str = "base"
    version: str = "1.0"

    @abstractmethod
    async def connect(self) -> None: ...

    @abstractmethod
    async def read_batch(self) -> List[RawReading]: ...

    @abstractmethod
    async def disconnect(self) -> None: ...

    async def health_check(self) -> bool:
        return getattr(self, "_connected", False)
```

新增协议：在 `shm-collector/shm_collector/plugins/protocols/` 下新建 `<name>_adapter.py`，继承 `ProtocolAdapter` 并设置 `name = "<protocol>"`，进程启动时自动注册。

## 断网缓存（v1.1 规划）

- 后端：`sqlite`（默认）/ `memory`（仅测试）
- 写入时机：发出的报文 5xx / 网络错误 / 超时，落本地队列
- 启动恢复：检测到未 flush 队列 → 按顺序重发
- 上线 flush：连接恢复后立即排空
- 容量上限：`max_size_bytes` 软上限，到达后丢弃最旧批次并告警
- 不在本地持久化设备元数据（device / channel 元数据以后端为准）

> 该模块在 v1.0 标记为「规划中」，上线版本尚未提供 SQLite 后端实现；架构占位仅用于描述。

## 与后端插件的关系

| 维度 | 后端插件（中央采集） | Collector（边缘采集） |
| --- | --- | --- |
| 部署位置 | `shm-backend` 进程内 | 独立进程 / 边缘节点 |
| 协议元数据 | `app/plugins/protocols/` | `shm-collector/shm_collector/plugins/protocols/` |
| 设备配置 | `devices.config` 存 DB | `config.toml` 文件 |
| 前端协议表单 | `GET /api/v1/protocols` 提供 schema | 独立 schema 文件（不走 `/api/v1/protocols`） |
| 升级影响 | 需重启后端 | 仅需重启 collector |
| 代码复用 | — | 接口签名一致，但代码双份（**过渡状态**；长期方向是从后端解耦，由 collector 统一承载） |

> 当前同一协议在两边各实现一次是**过渡状态**，不是终态设计。长期方向是把协议适配器从后端完全解耦——抽到独立 Python 包（或与 collector 共仓），由 collector 统一承载；后端只保留 `POST /api/v1/data/ingest` 接入。这样换来的是「后端零协议代码」+「collector 单一权威实现」，而不是「两边各一份」。

## 部署

Docker：

```bash
docker run -d --name shm-collector \
  -v /etc/shm-collector:/etc/shm-collector:ro \
  -v /var/lib/shm-collector:/var/lib/shm-collector \
  -p 9090:9090 \
  ghcr.io/zhiwei-shm/shm-collector:1.0.0 \
  --config /etc/shm-collector/config.toml
```

Compose 片段（在 `shm-backend/docker-compose.yml` 之外独立管理）：

```yaml
services:
  collector:
    image: ghcr.io/zhiwei-shm/shm-collector:1.0.0
    restart: unless-stopped
    volumes:
      - ./collector/config.toml:/etc/shm-collector/config.toml:ro
      - collector-data:/var/lib/shm-collector
    ports:
      - "9090:9090"   # Prometheus metrics
    environment:
      # TOML 中 [server] 段用环境变量覆盖敏感字段
      SHM_COLLECTOR__SERVER__API_KEY: ${EDGE_API_KEY}
      SHM_COLLECTOR__SERVER__BACKEND_URL: http://api:8000
    depends_on:
      - api

volumes:
  collector-data:
```

Kubernetes：建议作为 **DaemonSet** 部署到边缘节点组（每个物理位置一个 Pod），也可作为 Deployment 部署多个副本做容灾。详细清单见 [Kubernetes 部署](/deploy/k8s#collector-deployment)。

## 可观测

- stdout 结构化日志（JSON / text 可配）
- Prometheus 指标（`/metrics`）：
  - `collector_readings_total{device, channel, quality}`
  - `collector_ingest_latency_seconds`
  - `collector_buffer_size_bytes`
  - `collector_adapters_connected{protocol}`
  - `collector_ingest_errors_total{kind}`（4xx / 5xx / network）
- 进程健康：`/healthz` 暴露 200 当且仅当至少一个 adapter 已连接

## 限制与已知缺口（v1.0）

- 暂不直接写数据库——所有 readings 都经 `POST /api/v1/data/ingest` 写入；「直写 TimescaleDB」是 v2.0 路线图
- 设备清单在 collector 侧，重启 backend 不会反向同步 collector 配置
- 协议适配器代码与 `shm-backend` 平行维护（**过渡状态**；v2 远期：从后端完全解耦，统一由 collector / 独立适配器包承载，后端仅保留 `/api/v1/data/ingest` 接入端点）

## 下一步

- [Docker 部署](/deploy/docker)
- [Kubernetes 部署](/deploy/k8s)
- [配置项说明](/deploy/config)
- [接入协议](/developer/protocol/)：连接协议层复用
- [插件开发](/developer/plugin/)：后端插件开发
- [系统架构](/guide/architecture)
