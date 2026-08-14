# 后端模块

止危后端负责业务逻辑、数据存储、实时计算与告警引擎。

## 技术栈

- 待定（如 Go / Node.js / Python）
- PostgreSQL（元数据）
- TimescaleDB / InfluxDB（时序数据）
- Redis（缓存与消息）
- MQTT Broker（设备接入）

## 目录结构

```
shm-backend/
├── cmd/              # 启动入口
├── internal/
│   ├── api/          # HTTP API
│   ├── service/      # 业务服务
│   ├── repository/   # 数据访问
│   ├── domain/       # 领域模型
│   ├── task/         # 定时任务与实时计算
│   └── alarm/        # 告警引擎
├── pkg/              # 公共库
├── config/           # 配置定义
└── migrations/       # 数据库迁移
```

## 核心服务

- **项目服务**：项目、结构物、测点、传感器管理
- **数据服务**：时序数据写入、查询、聚合
- **计算服务**：特征值计算、频谱分析
- **告警服务**：规则评估、事件生成、通知发送

## 相关链接

- [开发环境](/developer/environment)
- [数据模型](/developer/database/)
- [接口文档](/developer/api/)
