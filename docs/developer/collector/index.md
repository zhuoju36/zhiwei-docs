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
- 上报延迟会被采集到 `collector_ingest_latency_seconds` 直方图

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
backend = "memory"                         # 断网缓存后端：memory（v1.0 默认）/ sqlite（v1.1 规划中）
path = "/var/lib/shm-collector/buffer.db"
max_size_bytes = 1073741824                 # 1 GiB 软上限

[log]
level = "INFO"                             # DEBUG / INFO / WARNING / ERROR
format = "json"                            # json / text

[metrics]
enabled = true                             # 暴露 /metrics（Prometheus 格式）
port = 9090                                # /metrics + /healthz

# ──────── 设备清单 ────────
# 一个 [[devices]] block = 一个物理设备；由 protocol 字段决定走哪个适配器。
# adapter 在 shm_collector/plugins/protocols/<protocol>_adapter.py 自动发现。

[[devices]]
device_code = "GW-HTTP-001"                # 必须与后端 devices.device_code 一致
protocol = "http_json"
enabled = true
sample_interval_ms = 1000

[devices.config]                            # 透传给适配器作为 ProtocolConfig 字段（host/port/auth）
host = "http://127.0.0.1"
port = 8080

[devices.config.extra]                     # 其他任意字段走 ProtocolConfig.extra
path = "/readings"
timeout_ms = 3000

[[devices.channels]]                       # 可选：通道声明，主要用于文档与协议层校验
channel_code = "ACC-X"
unit = "m/s2"
scale = 1.0
data_type = "float32"

[[devices]]
device_code = "GW-MODBUS-001"
protocol = "modbus_tcp"
enabled = true
sample_interval_ms = 1000

[devices.config]
host = "10.0.0.10"
port = 502

[devices.config.extra]
slave_id = 1                                  # 配置字段名不变；传给 pymodbus 时映射为 device_id
registers = [
  { address = 0, count = 2, data_type = "float32", channel_code = "ACC-X", scale = 0.001, unit = "m/s2" },
  { address = 2, count = 1, data_type = "uint16",  channel_code = "TEMP",   scale = 0.1,   unit = "°C" },
]

[[devices]]
device_code = "GW-DTU-001"                  # 监听型适配器：collector 主动监听 TCP 端口
protocol = "modbus_rtu_over_tcp"
enabled = true

[devices.config]
host = "0.0.0.0"
port = 5021                                 # DTU 主动 push 到这里

[devices.config.extra]
slave_id = 1
registers = [
  { address = 0, count = 2, data_type = "float32", channel_code = "ACC-X", scale = 0.001, unit = "m/s2" },
]

[[devices]]
device_code = "GW-MQTT-001"
protocol = "mqtt"
enabled = true
sample_interval_ms = 500

[devices.config]
host = "broker.local"
port = 1883

[devices.config.extra]
topic = "shm/+/+/value"
queue_max = 1000
```

### 配置加载

```
shm-collector --config /etc/shm-collector/config.toml
```

环境变量覆盖：`SHM_COLLECTOR__SERVER__API_KEY` 等（双下划线层级分隔），优先级高于 TOML。

## 协议适配器（自带）

Collector 自带 4 套协议适配器，**与 `shm-backend/app/plugins/protocols/` 平行**：

- 同一协议在两端各有一份实现，接口签名一致但代码独立
- 通过 `pkgutil` 启动时扫描 `shm_collector/plugins/protocols/` 自动注册
- 已知实现：

| name | 类型 | 端到端联调对象 |
| --- | --- | --- |
| `http_json` | 主动轮询 | [shm-mock](https://github.com/zhiwei-shm/shm-mock) `GET /readings` |
| `mqtt` | 主动订阅 | mosquitto broker |
| `modbus_tcp` | 主动轮询 | shm-mock 自实现从站 `:5020`（pymodbus 客户端） |
| `modbus_rtu_over_tcp` | **监听型**（DTU 透传） | shm-mock DTU 客户端 `:5021` |

### 监听型适配器（DTU 透传）

`modbus_rtu_over_tcp` 与上面三种主动型不同：collector 在指定端口起 TCP 监听器，**等设备/DTU 主动 push 字节流进来**，由 `decode_stream()` 解析为 RTU 帧再映射为 `RawReading`。适用于 4G DTU 透传等场景。

监听型适配器必须设 `supports_listen = True`，并由 `CollectorRuntime` 直接调用 `adapter.start_listener(buffer, stop_event, on_connected=...)`，**不**经过 `Pipeline` 攒批逻辑（无 sample_interval 概念，DTU 推一次就收一次）。

### 抽象接口（**禁止修改**）

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class RawReading:
    device_code: str
    channel_code: str
    timestamp: datetime        # UTC
    value: float
    unit: str = ""
    quality: str = "good"      # good | bad | uncertain
    raw_bytes: bytes = b""
    extra: dict[str, Any] = field(default_factory=dict)


class ProtocolAdapter(ABC):
    name: str = "base"
    version: str = "1.0.0"
    supports_batch: bool = False
    supports_listen: bool = False   # 监听型适配器（DTU 透传）

    @abstractmethod
    async def connect(self) -> None: ...

    @abstractmethod
    async def read_batch(self) -> list[RawReading]: ...

    @abstractmethod
    async def disconnect(self) -> None: ...

    def decode_stream(self, data: bytes) -> list[RawReading]:
        """监听型适配器实现：把字节流切分为 RawReading。"""

    async def start_listener(self, buffer, stop_event, on_connected=None) -> None:
        """监听型适配器实现：起 TCP 监听器，持续接收并写入 buffer。"""

    async def health_check(self) -> dict[str, Any]: ...
```

新增协议：在 `shm-collector/shm_collector/plugins/protocols/` 下新建 `<name>_adapter.py`，继承 `ProtocolAdapter` 并设置 `name = "<protocol>"`，进程启动时自动注册。详细步骤见 [adding-protocol-adapter.md](https://github.com/zhiwei-shm/shm-collector/blob/main/docs/developer/adding-protocol-adapter.md)。

### 第三方库 API 变更的兼容性陷阱

适配器若依赖第三方库（pymodbus / aiomqtt / opcua 等），**该库大版本升级时必须验证 API 兼容性**。`modbus_tcp_adapter` 历史上踩过坑：pymodbus 3.7 把 `read_holding_registers(slave=)` 改名为 `device_id=`，旧代码会被静默走到 `except Exception` 分支，所有 Modbus 读数都变成 `quality="bad"`——单元测试用 `MagicMock` 跑不出来，必须连真后端/真从站才能暴露。

防护措施：

1. 用 `inspect.signature()` 拿真实参数名，加签名守卫测试（参考 `test_modbus_tcp_adapter.py::test_read_batch_kwarg_matches_pymodbus_signature`）
2. 联调必须有真从站/真 broker：推荐用 [`shm-mock`](https://github.com/zhiwei-shm/shm-mock) 一并跑 4 协议（`config.dev-multi.toml` 已配好），确保实际数据流通

## 断网缓存

- v1.0：**memory**（双队列 + 字节估算 + 软上限丢最旧批）
- v1.1 规划：**sqlite**（已留抽象 + `NotImplementedError` 占位，启动时 fail-fast）
- `requeue()` 把失败批放回头部，连接恢复后按 FIFO 顺序重发
- `max_size_bytes` 软上限：到达后丢弃最旧 1/10 批次 + WARNING 日志 + `collector_buffer_size_bytes` 指标
- 不在本地持久化设备元数据（device / channel 元数据以后端为准）

> SQLite 后端的具体设计见 [`shm-collector/docs/developer/adding-cache-backend.md`](https://github.com/zhiwei-shm/shm-collector/blob/main/docs/developer/adding-cache-backend.md)（开发指南）。

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

## 本地联调（与 shm-mock）

无真硬件的联调场景下，推荐用 [`shm-mock`](https://github.com/zhiwei-shm/shm-mock) 作为设备侧模拟器：

```
┌────────────────────────────────────────────────────┐
│  shm-mock (Python, port 8030)                     │
│   ├─ GET /readings  ──── http_json 适配器          │
│   ├─ MQTT publish    ──── mqtt 适配器（需 broker）  │
│   ├─ Modbus TCP 5020 ──── modbus_tcp 适配器        │
│   └─ DTU RTU 5021   ──── modbus_rtu_over_tcp 适配器 │
└────────────────────────────────────────────────────┘
              │
              ▼  上报到 http://localhost:8000 (后端)
```

shm-collector 仓库已带两份现成配置：

- `config.dev.toml` —— 单设备（http_json）连 mock `:60280`
- `config.dev-multi.toml` —— 三协议同时连 shm-mock（http_json + modbus_tcp + modbus_rtu_over_tcp）

启动命令：

```bash
# 1. 启 shm-mock（http_json 默认开；启用 modbus 加 env）
cd ../shm-mock
SHM_MOCK_MODBUS_ENABLED=true SHM_MOCK_DTU_RTU_ENABLED=true \
    uv run uvicorn app.main:app --host 0.0.0.0 --port 8030 --no-access-log

# 2. 启 collector
shm-collector --config config.dev-multi.toml
# → /healthz 看到 3 个 adapter connected
# → /metrics 看到 collector_readings_total 持续上涨
```

> shm-mock v0.4.0 默认行为与 collector 期望存在差异：DTU RTU 客户端**每个通道发一个独立 RTU 帧**，而 collector 期望一个 RTU 帧 = 整块寄存器响应（按地址索引）。联调时仅 `STRAIN-01`（addr=0）能解出，其余通道在 collector 端被跳过——这是 shm-mock framing 行为问题，需 shm-mock 开发者修复。

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
      - "9090:9090"   # Prometheus metrics + /healthz
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
  - `collector_ingest_latency_seconds`（Histogram，整批上报耗时含重试）
  - `collector_buffer_size_bytes`
  - `collector_adapters_connected{protocol, device}`
  - `collector_ingest_errors_total{kind}`（4xx / 5xx / network）
- 进程健康：`/healthz` 暴露 200 当至少一个 adapter 已连接，否则 503

## 测试分层

测试目录按"是否依赖真实后端"二分：

| 目录 | 内容 | 跑法 |
| --- | --- | --- |
| `tests/unit/` | 单元 + 进程内集成（mock backend/设备/子进程） | `pytest -m unit` |
| `tests/api/` | 与 `:8000` 真实后端联动 | `pytest -m api`（不可达自动 skip） |

详见 [`docs/developer/testing.md`](https://github.com/zhiwei-shm/shm-collector/blob/main/docs/developer/testing.md)。

## 限制与已知缺口（v1.0）

- 暂不直接写数据库——所有 readings 都经 `POST /api/v1/data/ingest` 写入；「直写 TimescaleDB」是 v2.0 路线图
- 设备清单在 collector 侧，重启 backend 不会反向同步 collector 配置
- SQLite 缓存后端尚未实现（仅占位）
- 协议适配器代码与 `shm-backend` 平行维护（**过渡状态**；v2 远期：从后端完全解耦，统一由 collector / 独立适配器包承载，后端仅保留 `/api/v1/data/ingest` 接入端点）
- DTU RTU 监听器假设 DTU 一次 push = 整块寄存器响应；若 DTU 行为是「每寄存器一帧」，需在 DTU 端/collector 端协商一致（见「本地联调」一节）

## 下一步

- [Docker 部署](/deploy/docker)
- [Kubernetes 部署](/deploy/k8s)
- [配置项说明](/deploy/config)
- [接入协议](/developer/protocol/)：连接协议层复用
- [插件开发](/developer/plugin/)：后端插件开发
- [系统架构](/guide/architecture)
- [shm-collector 仓库](https://github.com/zhiwei-shm/shm-collector)：开发者文档（架构、模块布局、扩展协议/缓存）
- [shm-mock 仓库](https://github.com/zhiwei-shm/shm-mock)：本地联调用设备侧模拟器