---
layout: home

hero:
  name: 止危
  text: 开源结构健康监测平台
  tagline: 多源数据接入 · 实时在线分析 · 可视化数字孪生
  image:
    src: /logo.svg
    alt: 止危 Logo
  actions:
    - theme: brand
      text: 演示体验
      link: https://www.zhiwei-shm.com/app
    - theme: alt
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 什么是止危
      link: /guide/what-is-zhiwei
    # - theme: alt
    #   text: GitHub
    #   link: https://github.com/zhiwei-shm
    # - theme: alt
    #   text: Gitee
    #   link: https://gitee.com/zhuoju36/zhiwei-shm

features:
  - icon: 📡
    title: 多源数据接入
    details: 内置 MQTT、HTTP、Modbus TCP 与 DTU 透传（Modbus RTU over TCP）适配器，统一接入振弦、应变、加速度、温湿度等传感器。
  - icon: ⚡
    title: 实时在线分析
    details: 阈值告警、FFT 频谱、基础统计等算法以插件形式挂载，按通道异步评估与计算，结构异常第一时间被发现。
  - icon: 🖥️
    title: 可视化数字孪生
    details: 基于 Web 的 2D/3D 可视化看板，OBJ/STL/PLY/glTF/GLB 模型自动转 GLB 后与通道实时联动。
---

## 快速预览

```bash
# 1. 克隆仓库
git clone https://github.com/zhiwei-shm/zhiwei.git
cd zhiwei

# 2. 启动后端基础设施（PostgreSQL/TimescaleDB、Redis、MinIO）
cd shm-backend
docker compose up -d postgres redis minio

# 3. 初始化数据库与首个管理员
.venv/bin/alembic upgrade head
.venv/bin/python -m scripts.init_db
.venv/bin/python -m scripts.init_admin

# 4. 启动 API
.venv/bin/python -m uvicorn app.main:app --reload
```

打开 `http://localhost:8000/docs` 查看 Swagger UI；首次访问 `http://localhost:8000/setup` 创建第一个 admin 后即可登录。

## 六层数据拓扑

止危把监测对象组织成一棵六层拓扑树：

```
用户 → 项目 → 设备 → 传感器（位置 + 仪器元数据）→ 通道（单位 / 采样率 / 告警规则）→ 读数
```

时序数据、告警、分析任务一律按 **通道** 粒度寻址；传感器即测点，一测点对应一个仪器。

## 适用场景

- **桥梁监测**：挠度、应变、振动、索力、交通荷载
- **建筑监测**：沉降、倾斜、裂缝、风压、地震响应
- **风机监测**：塔筒振动、叶片应变、基础沉降
- **铁路/轨道**：轨温、轨缝、道床沉降、车辆荷载

## 加入社区

止危是一个开源项目，欢迎提交 Issue、PR 与案例分享。

- [贡献指南](/developer/contribute)
- [联系我们](/community/contact)