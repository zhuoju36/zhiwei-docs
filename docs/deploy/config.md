# 配置项说明

本文汇总止危所有可配置项，涵盖环境变量与配置文件。

## 通用配置

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `production` | 运行环境 |
| `ZHIWEI_PORT` | `8080` | 前端访问端口 |
| `ZHIWEI_API_URL` | `http://localhost:3000` | 后端 API 地址 |

## 数据库配置

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `POSTGRES_HOST` | `postgres` | PostgreSQL 主机 |
| `POSTGRES_PORT` | `5432` | PostgreSQL 端口 |
| `POSTGRES_USER` | `admin` | 数据库用户名 |
| `POSTGRES_PASSWORD` | `admin` | 数据库密码 |
| `POSTGRES_DB` | `zhiwei` | 数据库名 |

## 时序数据库配置

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `TSDB_HOST` | `timescaledb` | 时序数据库主机 |
| `TSDB_PORT` | `5432` | 时序数据库端口 |
| `TSDB_USER` | `admin` | 用户名 |
| `TSDB_PASSWORD` | `admin` | 密码 |

## 缓存与消息队列

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `REDIS_HOST` | `redis` | Redis 主机 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `MQTT_HOST` | `mqtt` | MQTT Broker 主机 |
| `MQTT_PORT` | `1883` | MQTT 端口 |

## 安全相关

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `JWT_SECRET` | - | JWT 签名密钥 |
| `ZHIWEI_ADMIN_USER` | `admin` | 初始管理员账号 |
| `ZHIWEI_ADMIN_PASSWORD` | `admin` | 初始管理员密码 |

> 生产环境请务必修改默认密码与 JWT 密钥。

## 相关链接

- [Docker 部署](/deploy/docker)
- [备份与恢复](/deploy/backup)
