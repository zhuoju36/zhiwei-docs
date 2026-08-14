# 数据模型

止危的数据分为两类：元数据存储在 PostgreSQL，采样数据存储在时序数据库。

## 元数据模型（PostgreSQL）

### 项目（project）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID | 主键 |
| name | VARCHAR | 项目名称 |
| description | TEXT | 描述 |
| created_at | TIMESTAMP | 创建时间 |

### 结构物（structure）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID | 主键 |
| project_id | UUID | 所属项目 |
| name | VARCHAR | 名称 |
| type | ENUM | 类型（桥梁/建筑/风机/隧道/铁路） |
| location | JSONB | 位置信息 |

### 测点（measuring_point）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID | 主键 |
| structure_id | UUID | 所属结构物 |
| name | VARCHAR | 测点名称 |
| point_type | ENUM | 监测类型 |
| coordinates | JSONB | 坐标信息 |

### 传感器（sensor）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID | 主键 |
| model | VARCHAR | 型号 |
| manufacturer | VARCHAR | 厂商 |
| serial_number | VARCHAR | 序列号 |
| channel_count | INT | 通道数 |

## 时序数据模型

时序数据库中按测点+通道组织数据表，典型字段包括：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| time | TIMESTAMP | 采样时间 |
| point_id | UUID | 测点 ID |
| channel_id | UUID | 通道 ID |
| value | DOUBLE | 采样值 |
| quality | INT | 数据质量标识 |

## 相关链接

- [后端模块](/developer/backend/)
- [接入协议](/developer/protocol/)
