# 接入协议

止危通过标准化数据格式接入不同厂商的传感器与数采仪。

## 标准数据报文

设备上报的数据应为 JSON 格式，包含以下字段：

```json
{
  "deviceId": "sensor-001",
  "timestamp": 1700000000000,
  "points": [
    {
      "pointCode": "P-001",
      "channelCode": "CH-001",
      "value": 12.34,
      "unit": "mm",
      "quality": 0
    }
  ]
}
```

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| deviceId | STRING | 是 | 设备唯一标识 |
| timestamp | LONG | 是 | 毫秒时间戳 |
| points | ARRAY | 是 | 测点数据数组 |
| pointCode | STRING | 是 | 测点编码 |
| channelCode | STRING | 是 | 通道编码 |
| value | DOUBLE | 是 | 采样值 |
| unit | STRING | 否 | 单位 |
| quality | INT | 否 | 数据质量，0 表示正常 |

## 接入方式

### MQTT

- Topic 格式：`zhiwei/{deviceId}/data`
- QoS：建议 1
- Payload：标准 JSON 报文

### HTTP

- URL：`POST /api/v1/ingest`
- Header：`Content-Type: application/json`
- Body：标准 JSON 报文或批量数组

### Modbus

- 通过采集网关轮询或从站主动上报
- 需在网关配置寄存器映射表

## 自定义协议

如需接入非标设备，可开发自定义协议解析插件，参考 [插件开发](/developer/plugin/)。

## 相关链接

- [插件开发](/developer/plugin/)
- [后端模块](/developer/backend/)
