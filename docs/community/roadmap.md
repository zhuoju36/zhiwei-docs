# 产品路线图

> 与后端路线图对齐（后端 `shm-backend/架构说明书.md`）。版本号反映后端 `app/__init__.py:__version__`。

## v0.9（当前）

**核心能力**：

- [x] 六层数据拓扑（user → project → device → sensor → channel → readings）
- [x] FastAPI + Pydantic v2 + SQLAlchemy 2.0 async + asyncpg 全异步栈
- [x] TimescaleDB hypertable + 7 天保留策略
- [x] JWT（access 15min + refresh 7d）+ 首次部署引导
- [x] Celery 4 队列（alerts / analysis / reports / maintenance）
- [x] 协议适配器：HTTP JSON / MQTT / Modbus TCP / Modbus RTU over TCP（DTU 透传）
- [x] 分析插件：FFT / statistics；社区插件通过 entry_points（`shm_analyzers`）发布
- [x] 3D 模型上传（OBJ / STL / PLY / glTF / GLB）+ 自动 GLB 转换
- [x] WebSocket `/ws/data` + Redis Pub/Sub 跨实例广播
- [x] 阈值告警（按通道 `alert_rules`）+ Webhook / Email 通知
- [x] 用户管理 + RBAC（admin / project admin / write / read）
- [x] 平台元数据单行表

## v0.10 计划

- [ ] readings 上重建 1min / 1h 连续聚合视图
- [ ] 每项目通知通道配置（v0.9 是全局配置）
- [ ] 用户自服务（`/auth/me`、改自己密码、忘记密码、邮箱验证）
- [ ] 钉钉 / 企微 / Slack 专属 payload 包装
- [ ] Modbus RTU（串口直连）适配器
- [ ] OPC-UA 适配器
- [ ] 模态分析插件
- [ ] 趋势预测插件
- [ ] 审计日志（关键操作写入 `audit_logs`）
- [ ] 首次登录强制改密码
- [ ] zxcvbn 密码强度评分

## v1.0 计划

- [ ] `shm-collector` 独立仓与中央 / 边缘双采集模式（v0.9 → v1.0 文档迁移已完成）
- [ ] 完整边缘网关进程：断网续传（本地 SQLite 队列）、健康监控、Prometheus `/metrics`
- [ ] 协议适配器代码双份维护（**过渡状态**；v2 远期：从后端完全解耦，统一由 collector / 独立适配器包承载，后端仅保留 `/api/v1/data/ingest` 接入端点）
- [ ] 后端 + collector 共同 Docker 镜像发布流水线
- [ ] Kubernetes 化部署 + Helm Chart
- [ ] HTTPS / WSS 终止 + cert-manager 集成

## v1.0 远期

- [ ] 协议适配器从后端完全解耦——抽到独立 Python 包（或与 collector 共仓），由 collector 统一承载；后端仅保留 `POST /api/v1/data/ingest` 接入端点；「中央采集」模式仅保留 HTTP JSON 这类无需适配器代码的协议
- [ ] Collector 直写 TimescaleDB（持有 DB 用户，跳过 FastAPI，适合超大规模边缘场景）
- [ ] 跨区域复制（Postgres logical replication + MinIO 跨区）
- [ ] 多租户隔离
- [ ] 移动端适配（PWA / 微信小程序）
- [ ] AI 异常检测（基于历史时序的 autoencoder）
- [ ] 国际化（i18n）

## 长期愿景

打造开源领域最易用、最可扩展的结构健康监测平台，服务全球基础设施安全运营。