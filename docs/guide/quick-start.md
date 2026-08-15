# 快速开始

本指南将帮助你在 10 分钟内启动止危后端、完成首个管理员创建并完成一次完整的数据接入闭环。

## 环境要求

- Docker Engine >= 24.0
- Docker Compose >= 2.20
- Python >= 3.11（推荐 3.12，使用 `uv` 管理）
- Node.js >= 20（仅在需要本地启动文档站 / 前端开发时）
- Git
- 浏览器（推荐 Chrome / Edge / Firefox 最新版）

> 不想用 Docker 也可以参考 [开发环境](/developer/environment) 进行源码运行。

## 1. 获取代码

```bash
git clone https://github.com/zhuoju36/zhiwei-shm.git
cd zhiwei
```

## 2. 启动基础设施

后端自带 `docker-compose.yml`，会同时拉起 PostgreSQL（带 TimescaleDB 扩展）、Redis 与 MinIO。

```bash
cd shm-backend
docker compose up -d postgres redis minio
```

等待 Postgres 健康：

```bash
docker inspect -f '{{.State.Health.Status}}' shm-postgres
# healthy
```

## 3. 安装 Python 依赖与初始化数据库

```bash
# 创建虚拟环境（首次需要）
uv python install 3.12
uv venv --python 3.12 .venv

# 安装依赖（推荐中科大源）
uv pip install -r requirements.txt -i https://mirrors.ustc.edu.cn/pypi/simple

# 应用 Alembic 迁移 + TimescaleDB 初始化（hypertable / 连续聚合 / 保留策略）
cp .env.example .env
.venv/bin/alembic upgrade head
.venv/bin/python -m scripts.init_db
```

## 4. 启动 API 并创建首个管理员

新开终端，启动 FastAPI：

```bash
.venv/bin/python -m uvicorn app.main:app --reload
```

首次部署时 `users` 表为空，访问 `http://localhost:8000/setup`（或在另一个终端用 CLI）创建第一个 admin：

```bash
.venv/bin/python -m scripts.init_admin \
    --base-url http://localhost:8000
```

按提示输入用户名、邮箱、密码（≥ 8 位 + 同时包含字母和数字）。完成后即可用该账号登录。

> 默认登录方式：`POST /api/v1/auth/login` 获取 access token（15 分钟）与 refresh token（7 天）。

## 5. 配置第一个项目与设备

### 5.1 创建项目

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -d 'username=admin&password=admin12345' | jq -r '.data.access_token')

curl -X POST http://localhost:8000/api/v1/projects \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"name":"演示项目","description":"快速开始示例"}'
```

### 5.2 添加设备

```bash
curl -X POST http://localhost:8000/api/v1/devices \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"project_id":1,"device_code":"GW-DEMO","protocol":"http_json","config":{"host":"http://127.0.0.1:9000"}}'
```

### 5.3 添加传感器（位置 + 仪器元数据）

```bash
curl -X POST http://localhost:8000/api/v1/sensors \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"device_id":1,"sensor_code":"ACC1","sensor_name":"塔 3 第 1 测点","position":{"x":0,"y":0,"z":15.0},"model":"XYZ-123"}'
```

### 5.4 添加通道（单位 / 采样率 / 告警规则）

```bash
curl -X POST http://localhost:8000/api/v1/channels \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{
        "sensor_id":1,"channel_code":"X","channel_type":"acceleration",
        "unit":"m/s2","sampling_rate":100,"axis":"x",
        "alert_rules":[{"operator":"gt","threshold":0.5,"level":"warning"}]
    }'
```

## 6. 推送第一条时序数据

无需真实硬件，使用模拟器向 `/api/v1/data/ingest` 推送读数：

```bash
curl -X POST http://localhost:8000/api/v1/data/ingest \
    -H 'X-API-Key: edge-secret-key' \
    -H 'Content-Type: application/json' \
    -d '{
        "readings":[{
            "device_code":"GW-DEMO","channel_code":"X",
            "timestamp":"2026-08-14T12:00:00Z","value":0.42,"unit":"m/s2"
        }]
    }'
```

收到 `{"code":"OK","data":{"written":1}}` 即表示写入成功。

## 7. 查看数据与告警

```bash
# 最新值（Redis 缓存）
curl http://localhost:8000/api/v1/data/latest/1 \
    -H "Authorization: Bearer $TOKEN"

# 时序历史
curl -G http://localhost:8000/api/v1/data/timeseries \
    -H "Authorization: Bearer $TOKEN" \
    --data-urlencode "channel_id=1" \
    --data-urlencode "start=2026-08-14T00:00:00Z" \
    --data-urlencode "end=2026-08-14T23:59:59Z"
```

阈值规则触发后，`GET /api/v1/alerts?channel_id=1` 即可看到告警记录。

## 8. 实时推送（WebSocket）

打开浏览器控制台：

```js
const ws = new WebSocket(`ws://localhost:8000/ws/data?token=${TOKEN}`)
ws.onopen = () => ws.send(JSON.stringify({type:'cmd:subscribe', project_id:1}))
ws.onmessage = e => console.log(JSON.parse(e.data))
```

每次 `/data/ingest` 后，订阅了该项目频道的客户端会收到 `data:realtime` 事件。

## 下一步

- [系统架构](/guide/architecture)：理解模块划分与数据流
- [Docker 部署](/deploy/docker)：生产环境部署方式
- [用户手册](/user/project/)：深入学习各功能模块
- [后端 API 概览](/developer/api/)：所有 RESTful 接口一览

## 常见问题

**Q：启动后端口被占用怎么办？**

A：修改 `docker-compose.yml` 中的端口映射，例如将 `9000:9000`（MinIO）改为 `9100:9000`。

**Q：忘记管理员密码怎么办？**

A：登录 PostgreSQL 直接重置（生产环境请走用户管理接口；v0.9 中 admin 可通过 `PUT /api/v1/users/{id}/password` 重置任意用户密码）。