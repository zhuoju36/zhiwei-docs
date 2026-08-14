# Docker 部署

本文介绍如何使用 Docker Compose 快速部署止危平台。

## 环境要求

- Docker Engine >= 24.0
- Docker Compose >= 2.20
- 至少 2 核 CPU、4 GB 内存、50 GB 可用磁盘

## 目录结构

```
zhiwei/
├── docker-compose.yml
├── .env
├── shm-backend/
├── shm-frontend/
└── shm-collector/
```

## 1. 获取代码

```bash
git clone https://github.com/zhiwei-shm/zhiwei.git
cd zhiwei
```

## 2. 配置环境变量

复制示例配置文件：

```bash
cp .env.example .env
```

编辑 `.env`，常见配置项如下：

```txt
# 数据库
POSTGRES_USER=admin
POSTGRES_PASSWORD=change_me
POSTGRES_DB=zhiwei

# 前端访问端口
ZHIWEI_PORT=8080

# 后端服务
ZHIWEI_API_URL=http://localhost:3000

# 初始管理员
ZHIWEI_ADMIN_USER=admin
ZHIWEI_ADMIN_PASSWORD=admin
```

> 生产环境请务必修改默认密码与数据库密码。

## 3. 启动服务

```bash
docker compose up -d
```

等待所有服务健康检查通过：

```bash
docker compose ps
```

## 4. 访问平台

打开浏览器访问：

```
http://localhost:8080
```

使用 `.env` 中配置的初始管理员账号登录。

## 5. 查看日志

```bash
# 查看全部服务日志
docker compose logs -f

# 查看指定服务日志
docker compose logs -f shm-backend
```

## 6. 停止与更新

停止服务：

```bash
docker compose down
```

停止并保留数据：

```bash
docker compose down
```

停止并删除数据卷（谨慎操作）：

```bash
docker compose down -v
```

更新到新版：

```bash
git pull
docker compose pull
docker compose up -d
```

## 文档站容器化

本项目（`shm-docs`）自带 `Dockerfile`，可构建独立的文档站镜像（Nginx 提供静态站点）。

### 构建镜像

```bash
docker build -t zhiwei-docs .
```

### 运行

```bash
docker run -d --name zhiwei-docs -p 8080:80 zhiwei-docs
```

访问 `http://localhost:8080` 即可查看文档站。

### 健康检查

镜像内置健康检查，可使用 `docker inspect` 查看状态：

```bash
docker inspect --format '{{.State.Health.Status}}' zhiwei-docs
```

## 生产环境建议

1. **使用独立数据库**：将 PostgreSQL 与时序数据库部署在独立主机或托管服务上，便于备份与扩展。
2. **启用 HTTPS**：使用 Nginx / Traefik 等反向代理并配置 TLS 证书。
3. **配置日志轮转**：避免容器日志无限增长占满磁盘。
4. **设置资源限制**：在 `docker-compose.yml` 中为各服务配置 `mem_limit` 与 `cpus`。
5. **定期备份**：参考 [备份与恢复](/deploy/backup)。

## 故障排查

| 现象 | 可能原因 | 解决方法 |
| --- | --- | --- |
| 前端无法访问 | 端口冲突或服务未启动 | 检查 `docker compose ps` 与端口映射 |
| 后端启动失败 | 数据库连接失败 | 检查 `.env` 数据库配置与网络连通性 |
| 数据不显示 | 时序数据库未初始化 | 查看后端日志确认初始化脚本执行结果 |
| 告警不触发 | 规则未启用或通知配置错误 | 检查告警规则状态与通知渠道配置 |

## 下一步

- [配置项说明](/deploy/config)：详细了解所有环境变量
- [备份与恢复](/deploy/backup)：建立数据保护机制
- [版本升级](/deploy/upgrade)：平滑升级到新版
