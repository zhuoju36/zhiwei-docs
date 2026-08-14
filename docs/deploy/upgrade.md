# 版本升级

本文介绍如何将止危平滑升级到新版本。

## 升级前准备

1. 查看 [更新日志](/community/changelog) 了解新版变更
2. 备份当前数据，参考 [备份与恢复](/deploy/backup)
3. 在测试环境验证升级流程

## Docker Compose 升级

```bash
# 拉取最新代码
git pull

# 拉取最新镜像
docker compose pull

# 停止并重新启动服务
docker compose down
docker compose up -d
```

## 数据库迁移

后端服务启动时会自动执行数据库迁移。如遇迁移失败，请查看后端日志。

```bash
docker compose logs -f shm-backend
```

## 回滚

若升级后出现问题，可回滚到上一版本：

```bash
git checkout <previous-tag>
docker compose pull
docker compose up -d
```

> 回滚前请确认数据库 schema 兼容，必要时先恢复备份。

## 相关链接

- [更新日志](/community/changelog)
- [备份与恢复](/deploy/backup)
