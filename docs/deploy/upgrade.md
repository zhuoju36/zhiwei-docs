# 版本升级

本文介绍如何将止危后端平滑升级到新版本。

## 升级前准备

1. 查看 [更新日志](/community/changelog) 与后端 `CHANGELOG` 了解新版变更（特别是 `v0.8 → v0.9` 这类拓扑重构）
2. 备份当前数据，参考 [备份与恢复](/deploy/backup)
3. 在测试环境验证升级流程
4. 确认所有依赖方（前端、边缘网关）已同步升级

## Docker Compose 升级

```bash
# 拉取最新代码
git pull

# 拉取最新镜像
docker compose pull

# 停止服务
docker compose down

# 应用数据库迁移（必须）
docker compose run --rm api alembic upgrade head

# 初始化 TimescaleDB（幂等，可重跑）
docker compose run --rm api python -m scripts.init_db

# 启动
docker compose up -d
```

> 拓扑重构类升级（如 `v0.7 → v0.8` 的 sensor/channel 拆分、`v0.8 → v0.9` 的测点合并）通常伴随迁移脚本，启动后请观察日志确认迁移成功。

## Kubernetes 升级

```bash
# 更新镜像版本
kubectl -n shm set image deployment/shm-api api=ghcr.io/zhiwei-shm/shm-backend:<new>
kubectl -n shm set image deployment/shm-worker worker=ghcr.io/zhiwei-shm/shm-backend:<new>

# 执行迁移（独立 Job）
kubectl -n shm create job shm-migrate-<date> \
    --image=ghcr.io/zhiwei-shm/shm-backend:<new> \
    -- alembic upgrade head

# 初始化 TimescaleDB
kubectl -n shm create job shm-initdb-<date> \
    --image=ghcr.io/zhiwei-shm/shm-backend:<new> \
    -- python -m scripts.init_db
```

## 客户端兼容性

升级后端时建议同步检查：

- **前端**：v0.9 起按 sensor / channel 寻址，前端需对应升级；老前端调过时的 `points` 接口会 404
- **边缘网关**：标准报文格式稳定（`device_code` + `channel_code`）；如有自定义协议插件需确认 `ProtocolAdapter` 契约仍兼容
- **分析插件**：v0.8d 起的插件接口 v2 与早期 v1 不兼容；老插件升级后需改 `analyze` 签名

## 回滚

升级后出现问题可回滚：

```bash
# Docker Compose
git checkout <previous-tag>
docker compose pull
docker compose up -d

# Kubernetes
kubectl -n shm set image deployment/shm-api api=ghcr.io/zhiwei-shm/shm-backend:<prev>
kubectl -n shm set image deployment/shm-worker worker=ghcr.io/zhiwei-shm/shm-backend:<prev>
```

> 回滚前请确认数据库 schema 兼容——拓扑重构类版本通常不能直接回退，必须先恢复备份。

## 注意事项

- **生产环境升级窗口**：选择低峰期；提前通知相关方
- **不可中断服务**：用蓝绿 / 灰度发布；API 与 Worker 可独立升级
- **数据库迁移是单向的**：除非测试过反向迁移，否则不要在生产回退迁移
- **.env 与 Secret**：升级后检查是否有新增必填项（看 release notes）

## 相关链接

- [更新日志](/community/changelog)
- [备份与恢复](/deploy/backup)
- [Docker 部署](/deploy/docker)