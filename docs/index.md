---
layout: home

hero:
  name: 止危
  text: 开源结构健康监测平台
  tagline: 知微 · 止危 · 治未
  image:
    src: /home-preview.svg
    alt: 止危 3D 监测看板预览
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
    #   link: https://github.com/zhuoju36/zhiwei-shm
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

## 关键指标

<div class="home-stats">
  <div class="home-stat">
    <div class="home-stat-label">时序写入</div>
    <div class="home-stat-value">10万<span class="home-stat-unit">点/秒</span></div>
    <div class="home-stat-desc">单实例目标，asyncpg COPY 直写 hypertable</div>
  </div>
  <div class="home-stat">
    <div class="home-stat-label">数据拓扑</div>
    <div class="home-stat-value">6<span class="home-stat-unit">层</span></div>
    <div class="home-stat-desc">user → project → device → sensor → channel → readings</div>
  </div>
  <div class="home-stat">
    <div class="home-stat-label">端到端延迟</div>
    <div class="home-stat-value">&lt; 3<span class="home-stat-unit">秒</span></div>
    <div class="home-stat-desc">1 万条 readings 写入 + Redis 缓存 + WS 推送</div>
  </div>
</div>

<style>
.home-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin: 1.5rem 0 2rem;
}
.home-stat {
  padding: 1.25rem 1.5rem;
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  transition: border-color 0.2s;
}
.home-stat:hover { border-color: var(--vp-c-brand-1); }
.home-stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}
.home-stat-value {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  line-height: 1.1;
  font-feature-settings: "tnum";
}
.home-stat-unit {
  font-size: 1rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  margin-left: 0.25rem;
}
.home-stat-desc {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  margin-top: 0.5rem;
  line-height: 1.5;
}
@media (max-width: 640px) {
  .home-stats { grid-template-columns: 1fr; }
}

/* 放大 hero image：覆盖 VitePress 默认的 max-width:192/256/320px */
.VPHero .image-src,
.VPHomeHero .image-src {
  max-width: 500px !important;
  max-height: 333px !important;
  transition: transform .25s ease, filter .25s ease, box-shadow .25s ease;
  will-change: transform, filter;
}
.VPHero .image-src:hover,
.VPHomeHero .image-src:hover {
  /* 必须保留 VitePress 的 translate(-50%, -50%) 居中位移，否则会跳到容器左上 */
  transform: translate(-50%, calc(-50% - 3px)) scale(1.01);
  filter: drop-shadow(0 10px 20px rgba(34, 211, 238, 0.25))
          drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))
          brightness(1.04);
}
@media (max-width: 768px) {
  .VPHero .image-src,
  .VPHomeHero .image-src {
    max-width: 320px !important;
    max-height: 220px !important;
  }
  .VPHero .image-src:hover,
  .VPHomeHero .image-src:hover {
    transform: translate(-50%, calc(-50% - 2px)) scale(1.005);
  }
}
</style>

## 快速预览

```bash
# 1. 克隆仓库
git clone https://github.com/zhuoju36/zhiwei-shm.git
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