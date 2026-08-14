# 接入协议

止危通过统一的协议适配层接入不同厂商的传感器与数采仪：边缘网关或云端验证器按协议解析数据，最终都通过 `POST /api/v1/data/ingest`（`X-API-Key`）上报到云端。

v0.9 起按**通道**寻址：上报报文携带 `device_code + channel_code`（而非过时的 `point_code`），云端通过 device → sensor → channel 的 JOIN 链解析为 `channel_id` 后写入 `readings` hypertable。

## 标准上报报文

设备 / 边缘网关上报到 `POST /api/v1/data/ingest` 的 JSON：

```json
{
  "readings": [
    {
      "device_code": "GW-001",
      "channel_code": "ACC-X",
      "timestamp": "2026-08-14T12:34:56.789+00:00",
      "value": 0.0234,
      "unit": "m/s2",
      "quality": "good",
      "extra": { "raw_status": "ok" }
    }
  ]
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `device_code` | 是 | 设备唯一编码，对应 `devices.device_code` |
| `channel_code` | 是 | 通道编码，对应 `channels.channel_code`（v0.8b 起，非 `point_code`） |
| `timestamp` | 是 | ISO8601 UTC，边缘网关时间戳，非服务器接收时间 |
| `value` | 是 | 浮点数值 |
| `unit` | 否 | 计量单位（推荐 m/s² / με / °C / mm） |
| `quality` | 否 | `good` / `bad` / `uncertain`，默认 `good` |
| `extra` | 否 | 附加元数据，存入 `readings.metadata`（JSONB） |

约束：

- `readings`：1–10000 条/批
- 未知 `device_code` 或 `channel_code` 的读数会被静默丢弃并记日志
- 性能建议：批次 1000–5000 条；多通道合并到一个 readings 数组

## Headers

```
X-API-Key: <EDGE_API_KEY>     # .env 配置（默认 edge-secret-key，生产必须替换）
Content-Type: application/json
```

## 接入方式

### HTTP JSON（已内置）

最简单：智能传感器 / 边缘网关直接 POST 到 `/data/ingest`，按上面的标准报文。详见后端 [`api/protocols.md`](https://github.com/zhiwei-shm/zhiwei/tree/main/shm-backend/docs/api/protocols.md) § `http_json`。

### MQTT（已内置）

云端订阅 MQTT broker，按协议适配器解析后入库。`devices.config`：

```json
{
  "host": "broker.local",
  "port": 1883,
  "username": "edge",
  "password": "secret",
  "topic": "shm/+/+/value",
  "queue_max": 1000,
  "device_code": "GW-MQTT-01",
  "use_tls": false
}
```

broker 上转发的 payload 与标准报文一致。

### Modbus TCP（已内置）

云端按寄存器映射主动轮询（也可部署为边缘网关模式）。`devices.config`：

```json
{
  "host": "10.0.0.10",
  "port": 502,
  "slave_id": 1,
  "timeout_ms": 3000,
  "device_code": "GW-MOD-001",
  "sample_interval_ms": 1000,
  "registers": [
    {"address": 0, "count": 2, "data_type": "float32",
     "channel_code": "ACC-X", "scale": 0.001, "unit": "m/s2"},
    {"address": 2, "count": 1, "data_type": "uint16",
     "channel_code": "TEMP", "scale": 0.1, "unit": "°C"}
  ]
}
```

`data_type` 支持 `uint16` / `int16` / `uint32` / `int32` / `float32` / `float64`（大端字节序）。单寄存器失败时该点返回 `quality="bad"`，不影响其他点继续。

### Modbus RTU over TCP（v0.9 新增，DTU 透传）

现场仪表(RS485/Modbus RTU) → DTU(4G 透传) → 云端 `dtu_server` 监听端口。DTU 是透明管道；`app/dtu_server` 独立进程接收、解析（CRC16 校验）并直写时序库。`devices.config`：

```json
{
  "host": "0.0.0.0",
  "port": 5021,
  "slave_id": 1,
  "device_code": "GW-DTU-001",
  "registers": [
    {"address": 0, "count": 2, "data_type": "float32",
     "channel_code": "ACC-X", "scale": 0.001, "unit": "m/s2"}
  ]
}
```

约定：

- **一端口一设备**，`port` 必填
- 响应帧寄存器从 `address 0` 起连续排布
- 粘包/半包/坏帧（CRC 错）由服务端自动处理；异常响应仅记日志不产出读数

### Modbus RTU（串口直连，规划中）

需要 `pymodbus[serial]` 与边缘网关串口。

### OPC-UA（规划中）

需要 `asyncua>=1.0`。

## 自定义协议

如需接入非标设备，可在 `shm-backend/app/plugins/protocols/` 加一个 `<name>_adapter.py`：

1. 继承 `ProtocolAdapter`（`base.py`，**禁止修改契约**）
2. 设置类属性 `name = "<protocol>"`
3. 实现 `connect / read_batch / disconnect`；监听型额外设 `supports_listen = True` 并实现 `decode_stream`
4. 进程启动时由 `AdapterRegistry.discover()` 自动注册

监听型适配器无需 `connect` 语义；详见 `modbus_rtu_over_tcp_adapter.py`。

## 适配器列表查询

```bash
curl http://localhost:8000/api/v1/protocols \
    -H "Authorization: Bearer $TOKEN"
```

返回每个协议的 `name` / `version` / `supports_batch` / `config_schema`，前端可基于此动态生成协议配置表单。

## 相关链接

- [插件开发](/developer/plugin/)
- [后端模块](/developer/backend/)
- [数据采集与查看](/user/data/)