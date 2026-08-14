# 数据模型

止危的数据分两层：关系表（PostgreSQL 标准表）+ 时序表（TimescaleDB hypertable）。v0.9 起按六层拓扑组织元数据，时序按通道粒度存储。

## 关系模型（PostgreSQL）

### 六层拓扑

```
用户（users）
  └── 项目（projects）
        └── 设备（devices）
              └── 传感器（sensors）       ← 位置 + 仪器元数据
                    └── 通道（channels）   ← 单位 / 采样率 / 告警规则
                            └── 读数（readings，hypertable）
```

### users

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | SERIAL PK | 主键 |
| `username` | VARCHAR(64) UNIQUE | 用户名 |
| `email` | VARCHAR(128) UNIQUE | 邮箱 |
| `hashed_password` | VARCHAR(128) | bcrypt 哈希 |
| `role` | VARCHAR(16) | `admin` / `user` |
| `is_active` | BOOLEAN | 是否启用 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

### projects

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | SERIAL PK | 主键 |
| `name` | VARCHAR(128) | 项目名称 |
| `description` | TEXT | 描述 |
| `location` | JSONB | `{lat, lng, address}` |
| `model_file_key` | VARCHAR(256) | （兼容旧字段）当前主模型路径 |
| `created_by` | INT FK → users | 创建人 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

### user_projects（RBAC）

```sql
user_id INT FK → users,
project_id INT FK → projects,
permission VARCHAR(16) CHECK IN ('read', 'write', 'admin'),
PRIMARY KEY (user_id, project_id)
```

### devices

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | SERIAL PK | 主键 |
| `project_id` | INT FK → projects | 所属项目 |
| `device_code` | VARCHAR(64) UNIQUE | 全局唯一设备编码 |
| `device_name` | VARCHAR(128) | 显示名 |
| `protocol` | VARCHAR(32) | 协议名（`http_json` / `mqtt` / `modbus_tcp` / `modbus_rtu_over_tcp`） |
| `config` | JSONB | 协议配置（结构由协议 schema 决定） |
| `status` | VARCHAR(16) | `online` / `offline` / `error` |
| `last_seen` | TIMESTAMPTZ | 最近心跳时间 |
| `note` | TEXT | 备注 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

### sensors（v0.9：测点 + 传感器合一）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | SERIAL PK | 主键 |
| `device_id` | INT FK → devices | 所属设备 |
| `sensor_code` | VARCHAR(64) | 同 device 内唯一 |
| `sensor_name` | VARCHAR(128) | 测点名 |
| `sensor_type` | VARCHAR(32) | `structural_joint` / `pier` / ... |
| `position` | JSONB | `{x, y, z}`，3D 大屏标记 |
| `model` | VARCHAR(128) | 仪器型号 |
| `manufacturer` | VARCHAR(64) | 厂商 |
| `install_date` | DATE | 安装日期 |
| `last_calibration` | DATE | 上次校准 |
| `is_active` | BOOLEAN | 是否启用 |
| `metadata` | JSONB | 附加元数据 |
| `note` | TEXT | 备注 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

UNIQUE 约束：`(device_id, sensor_code)`。

### channels（v0.8b：信号通道）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | SERIAL PK | 主键 |
| `sensor_id` | INT FK → sensors | 所属传感器 |
| `channel_code` | VARCHAR(64) | 同 sensor 内唯一（如 `X` / `Y` / `Z` / `T`） |
| `channel_type` | VARCHAR(32) | `acceleration` / `strain` / `temperature` / ... |
| `unit` | VARCHAR(16) | `m/s²` / `με` / `°C` / `mm` |
| `sampling_rate` | INT DEFAULT 1 | 采样频率（Hz） |
| `position_offset` | JSONB | `{dx, dy, dz}` 相对传感器偏移 |
| `axis` | VARCHAR(8) | `x` / `y` / `z`（3D 大屏用） |
| `alert_rules` | JSONB | 阈值告警规则数组 |
| `is_active` | BOOLEAN | 是否启用 |
| `note` | TEXT | 备注 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

UNIQUE 约束：`(sensor_id, channel_code)`。

### alerts（v0.8b：按通道）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | SERIAL PK | 主键 |
| `channel_id` | INT FK → channels | 所属通道 |
| `alert_type` | VARCHAR(32) | 当前固定 `threshold`；规划 `trend` / `fft` |
| `level` | VARCHAR(16) | `info` / `warning` / `danger` |
| `message` | TEXT | 告警文案 |
| `value` | FLOAT | 触发值 |
| `threshold` | FLOAT | 命中阈值 |
| `started_at` | TIMESTAMPTZ | 首次触发时间（同一 level 不重置） |
| `ended_at` | TIMESTAMPTZ | 恢复或确认时间 |
| `is_resolved` | BOOLEAN | 是否已结束 |
| `resolved_by` | INT FK → users | 人工确认人 |

### 3d_models（v0.8c：项目多模型）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | SERIAL PK | 主键 |
| `project_id` | INT FK → projects | 所属项目 |
| `original_key` | VARCHAR(256) | MinIO: `models/{project_id}/{uuid}.{ext}` |
| `original_name` | VARCHAR(256) | 原始文件名 |
| `source_format` | VARCHAR(16) | `obj` / `stl` / `ply` / `gltf` / `glb` |
| `glb_key` | VARCHAR(256) | MinIO: `models/{project_id}/{uuid}.glb` |
| `status` | VARCHAR(16) | `pending` / `processing` / `success` / `failed` |
| `error` | TEXT | 转换错误信息 |
| `created_by` | INT FK → users | 上传人 |
| `created_at` | TIMESTAMPTZ | 创建时间 |
| `finished_at` | TIMESTAMPTZ | 转换完成时间 |
| `note` | TEXT | 备注 |

### analysis_jobs（v0.4+）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | SERIAL PK | 主键 |
| `channel_id` | INT FK → channels | 目标通道 |
| `plugin` | VARCHAR(64) | 插件名 |
| `params` | JSONB | 插件参数 |
| `status` | VARCHAR(16) | `pending` / `running` / `success` / `failed` |
| `result_key` | VARCHAR(256) | MinIO: `analysis/{id}/<artifact_name>` |
| `result_summary` | JSONB | 摘要（如 FFT 主频率） |
| `error` | TEXT | 错误信息 |
| `submitted_by` | INT FK → users | 提交人 |
| `created_at` / `started_at` / `finished_at` | TIMESTAMPTZ | 时间戳 |

### platform_settings（v0.7，单行 id=1）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `platform_name` | VARCHAR(128) | 平台名 |
| `contact_email` | VARCHAR(128) | 联系邮箱 |
| `description` | TEXT | 描述 |
| `logo_url` | VARCHAR(512) | Logo URL |
| `updated_at` | TIMESTAMPTZ | 更新时间 |
| `updated_by` | INT FK → users | 更新人 |

## 时序模型（TimescaleDB Hypertable）

### readings（v0.8b：按 channel）

```sql
CREATE TABLE readings (
    time TIMESTAMPTZ NOT NULL,
    channel_id INTEGER NOT NULL REFERENCES channels(id),
    value FLOAT NOT NULL,
    quality VARCHAR(8) DEFAULT 'good',    -- good / bad / uncertain
    metadata JSONB,
    PRIMARY KEY (time, channel_id)
);

SELECT create_hypertable('readings', 'time', chunk_time_interval => INTERVAL '1 day');
CREATE INDEX idx_readings_channel_time ON readings (channel_id, time DESC);

-- 7 天保留策略（保留策略由 scripts/init_db.py 幂等执行）
SELECT add_retention_policy('readings', INTERVAL '7 days');
```

**规划中**：在 readings 上重建 1min / 1h 连续聚合视图（Continuous Aggregate），历史查询按聚合粒度路由。

## 迁移流程

```bash
# 生成迁移（模型变更后）
.venv/bin/alembic revision --autogenerate -m "msg"

# 审查生成的脚本，必要时手改

# 应用迁移
.venv/bin/alembic upgrade head

# 幂等初始化 TimescaleDB（hypertable / 连续聚合 / 保留策略）
.venv/bin/python -m scripts.init_db
```

迁移仅管理**关系表结构**；hypertable / 连续聚合 / 保留策略由 `scripts/init_db.py` 维护（幂等可重跑）。

## 相关链接

- [后端模块](/developer/backend/)
- [接入协议](/developer/protocol/)
- [接口文档](/developer/api/)