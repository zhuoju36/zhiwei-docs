# 术语表

## A

**加速度计（Accelerometer）**
测量结构振动加速度的传感器，常用于模态分析与振动监测。

**告警（Alarm）**
当某通道的读数满足预设规则时产生的事件，包含等级、触发时间、恢复时间与处理人。

**告警规则（Alert Rule）**
挂在通道（channel）上的阈值条件数组：`{operator, threshold, level, suppress_seconds}`。

**admin（管理员）**
平台管理员，拥有项目 CRUD、用户管理、平台元数据编辑等全局权限。

## B

**边缘网关（Edge Gateway）**
部署在现场的协议转换节点，把现场设备（Modbus / MQTT / HTTP）数据转为标准 JSON 推送到云端 `POST /api/v1/data/ingest`。参考实现见后端 `scripts/run_edge_adapter.py`。

## C

**采样频率（Sampling Rate）**
通道每秒钟采集的样本数，单位 Hz。挂在通道（channel）层而非传感器层。

**采集设备（Device）**
挂在项目下的硬件网关或采集仪，绑定一种协议（modbus_tcp / mqtt / http_json / modbus_rtu_over_tcp）。

**传感器（Sensor）**
v0.9 起**测点与传感器合一**：同时携带位置（`position: {x,y,z}`）与仪器元数据（型号、厂商、校准日期）。一个传感器可挂多个通道。

**通道（Channel）**
传感器的一个信号通道（如 3 轴 IMU 的 X / Y / Z）。单位、采样率、告警规则都在通道；时序数据按通道粒度存储与寻址。

**Continuous Aggregate**
TimescaleDB 的物化视图自动刷新机制，用于降采样。规划中。

## D

**DTU（Data Transfer Unit）**
4G 透传网关，把现场 Modbus RTU 响应帧原样推送到云端。云端通过 `app/dtu_server` 独立进程接收、解析并直写时序库。

**读数（Reading）**
单条时序数据行，存储在 `readings` hypertable，按 `(time, channel_id)` 复合主键。

## F

**傅里叶变换（FFT）**
将时域信号转换到频域，用于识别结构的主导频率成分。内置分析插件。

## G

**GLB / glTF**
Three.js 推荐的 3D 模型格式。止危上传 OBJ/STL/PLY/glTF/GLB 后会自动转换为 GLB 供数字孪生加载。

## H

**Hypertable**
TimescaleDB 的自动分区表，对应用透明。`readings` 当前按 1 天 chunk + 7 天保留策略。

**Hz（采样频率）**
见「采样频率」。

## J

**JWT（JSON Web Token）**
止危采用的双令牌认证方式：access token（默认 15 分钟）+ refresh token（默认 7 天）。

## M

**MQTT**
一种轻量级物联网消息传输协议，常用于传感器数据上报。内置协议适配器。

**Modbus TCP / RTU**
工业领域最常用的串行通信协议。TCP 直接走 TCP socket；RTU 现场部署时通过 DTU 透传到云端 `modbus_rtu_over_tcp` 监听端口。

**模态分析（Modal Analysis）**
通过振动数据识别结构的固有频率、阻尼比与振型（规划中）。

## P

**平台元数据（Platform Settings）**
单行表 `platform_settings`（id=1），存平台名称、Logo、联系邮箱、描述，由 admin 通过 `PUT /api/v1/platform` 维护。

**项目（Project）**
止危中的顶级管理单元与数据隔离边界；admin 创建 / 普通用户按 `user_projects` 授权访问。

## R

**RBAC**
基于角色的访问控制。止危使用「全局角色（admin / user）」+「项目级授权（read / write / admin）」两层模型。

**RMS**
Root Mean Square，有效值，振动分析的核心统计指标。

## S

**SHM（结构健康监测）**
通过传感器与算法对工程结构进行长期或实时状态评估的技术体系。

**数字孪生（Digital Twin）**
物理结构在数字空间中的动态映射，可用于实时状态展示与仿真。

## T

**特征值（Feature Value）**
从原始采样数据中提取的统计或频域指标，如最大值、最小值、均值、有效值（RMS）、峰值因子。

## W

**WebSocket**
止危的实时推送通道 `ws://<host>/ws/data?token=<JWT>`；订阅项目频道后接收 `data:realtime` 与 `data:alert` 事件。

**Webhook**
一种通过 HTTP 回调向外部系统推送告警或事件的方式。止危的告警通知通道之一。

## X

**项目 / 项目**
止危中以「项目（project）」命名顶层管理单元；曾在 v0.1 之前叫「项目（project）」，v0.8a 统一为「项目」。