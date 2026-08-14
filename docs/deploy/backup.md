# 备份与恢复

定期备份是保障监测数据安全的重要措施。本文介绍止危后端的备份与恢复方案。

## 备份内容

- PostgreSQL / TimescaleDB（关系表 + 时序 hypertable）
- MinIO（3D 模型 + 分析附件）
- Redis（非关键：缓存可重建；不建议备份）

> 配置文件（`.env`、`docker-compose.yml`）走版本控制（Git）而非备份。

## PostgreSQL 物理备份（推荐生产）

使用 `pg_dump` 做全量逻辑备份：

```bash
docker exec shm-postgres pg_dump -U shm_user -Fc shm_db > shm_$(date +%F).dump
```

带 `-Fc`（自定义格式）压缩比高，配合 `pg_restore` 还原更高效。

### 全库恢复

```bash
# 创建空库
docker exec shm-postgres createdb -U shm_user shm_db_restore

# 还原
docker exec -i shm-postgres pg_restore -U shm_user -d shm_db_restore --no-owner < shm_2026-08-14.dump
```

### 仅关系表恢复（保留 readings）

```bash
# 排除 readings hypertable 时序列
docker exec shm-postgres pg_dump -U shm_user -N public --exclude-table=readings shm_db > shm_meta_$(date +%F).sql
```

> TimescaleDB 的 hypertable 不能直接跨大版本回退；版本升级时建议先做全量物理备份 + 新库恢复。

## 时序数据备份（可选）

`readings` hypertable 保留 7 天由 TimescaleDB 保留策略自动清理，长期数据按需归档：

- 短期 7 天内数据：随 `pg_dump` 全量备份
- 长期归档：建议通过 `timescaledb-backup` 或定期 `COPY readings TO` 导出到 MinIO

```sql
-- 导出某通道某月数据到 CSV
\copy (SELECT * FROM readings WHERE channel_id = 1 AND time >= '2026-08-01' AND time < '2026-09-01') TO '/tmp/ch1_202608.csv' CSV HEADER;
```

## MinIO 备份

```bash
# 使用 mc 客户端同步到备份桶或本地
docker run --rm -it \
    --network container:shm-minio \
    -v $(pwd)/backup:/backup \
    minio/mc \
    /bin/sh -c '
        mc alias set local http://localhost:9000 minio_admin change_me &&
        mc mirror local/shm-models /backup/shm-models
    '
```

或使用 `mc mirror --remove` 把本地不存在于远端的对象删除（双向同步慎用）。

## 自动化备份

推荐通过 cron / Kubernetes CronJob 每日执行：

```bash
#!/bin/bash
# /opt/shm-backup.sh
set -euo pipefail

DATE=$(date +%F)
BACKUP_DIR=/backup/$DATE
mkdir -p "$BACKUP_DIR"

# 1. Postgres 全量
docker exec shm-postgres pg_dump -U shm_user -Fc shm_db > "$BACKUP_DIR/shm.dump"

# 2. MinIO 同步
docker run --rm --network container:shm-minio \
    -v "$BACKUP_DIR":/backup minio/mc \
    /bin/sh -c "mc mirror local/shm-models /backup/shm-models"

# 3. 上传到对象存储 / 异地
# aws s3 sync "$BACKUP_DIR" s3://my-backups/shm/$DATE/

# 4. 清理 30 天前的本地备份
find /backup -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;
```

```cron
# /etc/cron.d/shm-backup
0 3 * * * root /opt/shm-backup.sh >> /var/log/shm-backup.log 2>&1
```

## 恢复演练

每季度在测试环境做一次完整恢复演练：

1. 准备一台干净的 Docker 环境
2. 启动 Postgres + Redis + MinIO
3. 按时间倒序执行：restore → `alembic upgrade head` → `python -m scripts.init_db` → 启动 API
4. 验证：登录 → 拉取历史 → 触发一次 ingest → 检查最新值与告警

## 相关链接

- [Docker 部署](/deploy/docker)
- [版本升级](/deploy/upgrade)
- [TimescaleDB 备份文档](https://docs.timescale.com/self-hosted/latest/backup/)