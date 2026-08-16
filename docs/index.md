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
/* 用 aspect-ratio 锁死比例，避免 max-width + max-height 双约束在 Chrome/Safari 下表现不一致 */
.VPHero .image-src,
.VPHomeHero .image-src {
  max-width: 500px !important;
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 2;
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
  }
  .VPHero .image-src:hover,
  .VPHomeHero .image-src:hover {
    transform: translate(-50%, calc(-50% - 2px)) scale(1.005);
  }
}
</style>

## 快速预览

```bash
# 1. 克隆编排仓库（git submodule 包含 backend / frontend / docs / mock）
git clone --recursive https://github.com/zhuoju36/zhiwei-shm.git
cd zhiwei-shm
git submodule update --init --recursive

# 2. 准备环境变量（首次）
cp .env.example .env
# 生产环境务必替换 SECRET_KEY / EDGE_API_KEY / MINIO_*

# 3. 一键拉起全栈（远端预构建镜像，entrypoint 自动迁移 + init admin）
docker compose up -d --build

# （可选）附加 profile
docker compose --profile dev up -d   # 加上 shm-mock（模拟数据源，向 /api/v1/ingest 推读数）
```

启动后通过唯一的 nginx 网关访问：

| 路径 | 入口 |
| --- | --- |
| `/` | 文档站（本仓库，VitePress 静态站） |
| `/app/` | 数据大屏前端（Vue 3 + Three.js） |
| `/api/docs/` | Swagger UI（后端 OpenAPI） |
| `/api/redoc/` | ReDoc |
| `/api/v1/data/ingest` | 边缘网关 / 数据采集器上报入口（`X-API-Key`） |
| `/ws/data` | WebSocket 实时推送（`?token=<JWT>`） |
| `:9001` | MinIO 控制台（仅开发暴露，生产移除） |

首次启动时 `shm-api` 容器会自动跑 Alembic 迁移、`scripts.init_db`（hypertable + 保留策略），并在 `.env` 提供 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 时自动创建首个管理员。手动创建管理员也可走 `http://localhost/setup`（仅 `users` 表为空时开放）。

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