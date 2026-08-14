# 常见问题

## 安装与部署

### Q：止危支持哪些部署方式？

A：开发 / 测试推荐 Docker Compose 单机部署；生产环境推荐 Kubernetes 部署（详见 [K8s 部署](/deploy/k8s)）。源码运行方式参考 [开发环境](/developer/environment)。

### Q：最低硬件配置要求是什么？

A：测试与小规模项目建议至少 2 核 CPU、4 GB 内存、50 GB 磁盘。生产环境根据传感器数量与采样频率扩展；高频振动（100 Hz+）建议数据库独立部署并配置 SSD。

### Q：默认端口冲突怎么办？

A：基础设施端口由 `shm-backend/docker-compose.yml` 管理：Postgres `5432`、Redis `6379`、MinIO `9000 / 9001`、API `8000`。可在 compose 文件中修改映射。

### Q：首次启动后如何创建管理员？

A：`users` 表为空时访问 `http://<host>:8000/setup`，或在服务端运行 `python -m scripts.init_admin --base-url http://localhost:8000`（详见 [快速开始](/guide/quick-start)）。

## 数据接入

### Q：支持哪些传感器协议？

A：内置 HTTP JSON、MQTT、Modbus TCP、Modbus RTU over TCP（DTU 透传）；Modbus RTU（串口直连）与 OPC-UA 规划中。新增协议 = 新增一个适配器文件，详见 [接入协议](/developer/protocol/)。

### Q：如何接入自有设备？

A：参考 [接入协议](/developer/protocol/) 了解标准数据报文。已有协议不需要写代码；私有协议可在 `app/plugins/protocols/` 加一个 `<name>_adapter.py`。

### Q：数据采样频率最高支持多少？

A：止危的 `readings` hypertable 设计目标为单实例 10 万点/秒。常规结构监测 1Hz–1kHz 均可承载；100 Hz+ 高频振动建议用边缘网关批量推送（`/data/ingest` 一次最多 10000 条/批）。

### Q：是否需要边缘网关？

A：不一定。设备能直接 POST 到 `http://<host>/api/v1/data/ingest` 即可（带 `X-API-Key`）。现场协议复杂的场景（Modbus RTU、串口、4G 透传）才需要边缘网关。参考 `scripts/run_edge_adapter.py`。

## 功能使用

### Q：一个项目可以有多少设备 / 传感器 / 通道？

A：无硬上限，受 PostgreSQL 与 Redis 性能约束。生产实践 1 万通道以内无压力；告警与最新值按通道寻址，可线性扩展。

### Q：传感器和通道是什么关系？

A：v0.9 起传感器即测点，挂位置 + 仪器元数据；通道挂在传感器下，挂单位 / 采样率 / 告警规则。一个传感器可以有 N 个通道（如 IMU 的 X / Y / Z）。时序数据按通道存储。

### Q：告警支持哪些通知方式？

A：当前支持 Webhook 与 Email（全局配置，未来支持按项目配置）。钉钉、企微、Slack 等可通过 Webhook 适配。

### Q：能否导出历史数据？

A：可通过 `GET /api/v1/data/timeseries` 接口拉取任意通道任意时间范围的数据（`interval=raw` / `1s` / `1m` / `1h` / `1d`）。前端可在数据查看页面导出 CSV / Excel / JSON。

### Q：3D 模型支持哪些格式？

A：OBJ / STL / PLY / glTF / GLB（最大 200 MB）。上传后由 Celery `reports` 队列异步转换为 GLB 供数字孪生加载。IFC 格式规划中（需 Blender + IfcOpenShell）。

## 开发与贡献

### Q：如何参与开发？

A：阅读 [贡献指南](/developer/contribute)，fork 仓库后提交 PR。后端代码规范详见 `shm-backend/AGENTS.md`。

### Q：是否支持二次开发？

A：支持。止危提供 RESTful API + WebSocket + 协议插件 + 分析插件机制，可在不修改核心代码的情况下扩展功能。分析插件可通过 Python entry_points 第三方发布。

### Q：插件用什么语言写？

A：后端插件（协议适配器、分析算法）用 Python；前端可视化组件用 Vue 3 + TypeScript。

## 安全与运维

### Q：JWT 怎么管理？

A：access token 默认 15 分钟有效，refresh token 默认 7 天有效。客户端拦截 401 后先尝试 refresh；refresh 失败再跳登录页。

### Q：边缘网关如何鉴权？

A：通过 `X-API-Key` 请求头，密钥为 `EDGE_API_KEY`（`.env` 配置）。生产必须替换默认值。

### Q：数据如何备份？

A：详见 [备份与恢复](/deploy/backup)。生产环境推荐 Postgres 物理备份 + MinIO 冷归档的组合。

## 其他

### Q：止危是否免费？

A：是的，止危基于 [MIT 协议](/about/license) 开源，可免费用于商业与非商业场景。