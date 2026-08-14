# 备份与恢复

定期备份是保障监测数据安全的重要措施。本文介绍止危的备份与恢复方案。

## 备份内容

- PostgreSQL 元数据
- 时序数据库采样数据
- 配置文件与上传文件

## PostgreSQL 备份

```bash
docker exec zhiwei-postgres pg_dump -U admin zhiwei > zhiwei_$(date +%F).sql
```

## PostgreSQL 恢复

```bash
docker exec -i zhiwei-postgres psql -U admin zhiwei < zhiwei_2026-01-01.sql
```

## 时序数据库备份

根据使用的时序数据库类型选择对应工具：

- TimescaleDB：使用 `pg_dump`
- InfluxDB：使用 `influx backup`

## 自动化备份

建议通过 cron 或 Kubernetes CronJob 每日执行备份，并将备份文件上传至对象存储。

## 相关链接

- [Docker 部署](/deploy/docker)
- [版本升级](/deploy/upgrade)
