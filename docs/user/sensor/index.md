# 传感器与通道

v0.9 起止危把「测点」与「传感器」合并为同一个实体 —— **传感器（sensor）**，挂在设备（device）下；同时一个传感器可挂多个**通道（channel）**，每个通道对应一条独立的时序数据。

| 实体 | 携带信息 | 说明 |
| --- | --- | --- |
| 传感器（sensor） | 位置坐标（`x, y, z`）、型号、厂商、校准日期、安装日期 | 即「测点 + 仪器」合一，与 3D 大屏的坐标绑定 |
| 通道（channel） | 单位、采样率、告警规则、轴向（X/Y/Z） | 时序数据按通道寻址；一个传感器可以有 1–N 个通道 |

## 数据拓扑

```
设备（device）──┐
                ├── 传感器 1（位置 + 仪器元数据）
                │     ├── 通道 X（加速度 X 轴）
                │     ├── 通道 Y（加速度 Y 轴）
                │     └── 通道 Z（加速度 Z 轴）
                └── 传感器 2（位置 + 仪器元数据）
                      └── 通道 T（温度）
```

## 功能概述

- 管理传感器基础信息（型号、厂商、编号、安装与校准日期）
- 在 3D 大屏上以传感器的 `position` 坐标绑定可视化标记
- 配置通道的单位、采样率、轴向与告警规则
- 查看每个通道的最新值、历史曲线与告警事件

## 操作步骤

### 添加传感器

1. 进入「传感器管理」页面
2. 选择目标设备
3. 点击「新建传感器」
4. 填写 `sensor_code`（同设备内唯一）、`sensor_name`（如「塔 3 第 1 测点」）
5. 填写三维坐标 `position`（用于 3D 大屏联动）
6. 选择仪器类型（`structural_joint` / `pier` / `girder` / ...）
7. 填写仪器元数据（型号、厂商、安装日期、校准日期）
8. 保存

### 为传感器添加通道

1. 进入传感器详情页
2. 切换到「通道」标签
3. 点击「新建通道」
4. 填写 `channel_code`（同传感器内唯一，如 `X` / `Y` / `Z` / `T`）
5. 选择 `channel_type`（`acceleration` / `strain` / `temperature` / `displacement` / ...）
6. 填写 `unit`（`m/s2` / `με` / `°C` / `mm`）
7. 填写 `sampling_rate`（Hz；加速度通常 100–1000）
8. 可选：填写 `axis`（`x` / `y` / `z`，给 3D 大屏着色用）
9. 可选：配置 `alert_rules` 告警规则数组（详见 [告警规则](/user/alarm/)）
10. 保存

### 校准管理

1. 进入传感器详情页
2. 切换到「校准记录」标签
3. 编辑 `last_calibration` 日期、上传校准报告附件

## 告警规则配置

通道上的 `alert_rules` 是 JSON 数组，结构如下：

```typescript
interface AlertRule {
  operator: "gt" | "lt" | "ge" | "le" | "eq" | "ne";
  threshold: number;
  level: "info" | "warning" | "danger";
  message?: string;
  suppress_seconds?: number;  // 抑制窗口（秒），默认 60
}
```

每次边缘网关上报读数后，Celery `alerts` 队列异步评估涉及的通道；匹配则创建或刷新告警（详见 [告警规则](/user/alarm/)）。

## API 入口

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/v1/sensors` | `GET`（按 `device_id`） | 列出传感器 |
| `/api/v1/sensors` | `POST` | 创建传感器 |
| `/api/v1/sensors/{id}` | `GET / PUT / DELETE` | 详情 / 更新 / 删除 |
| `/api/v1/channels` | `GET`（按 `sensor_id`） | 列出通道 |
| `/api/v1/channels` | `POST` | 创建通道 |
| `/api/v1/channels/{id}` | `GET / PUT / DELETE` | 详情 / 更新 / 删除 |

详见 [接口文档 - 传感器](/developer/api/#传感器) 与 [接口文档 - 通道](/developer/api/#通道)。

## 相关链接

- [项目管理](/user/project/)
- [数据采集与查看](/user/data/)
- [告警规则](/user/alarm/)
- [接入协议](/developer/protocol/)