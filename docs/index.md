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
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 什么是止危
      link: /guide/what-is-zhiwei
    - theme: alt
      text: GitHub
      link: https://github.com/zhiwei-shm

features:
  - icon: 📡
    title: 多源数据接入
    details: 支持 MQTT、HTTP、Modbus 等主流协议，统一接入振弦、应变、加速度、温湿度等多种传感器。
  - icon: ⚡
    title: 实时在线分析
    details: 内置特征值提取、趋势分析、阈值告警与频谱分析，让结构异常第一时间被发现。
  - icon: 🖥️
    title: 可视化数字孪生
    details: 基于 Web 的 2D/3D 可视化看板，将测点、传感器、告警事件与结构模型实时联动。
---

## 快速预览

```bash
# 1. 克隆仓库
git clone https://github.com/zhiwei-shm/zhiwei.git
cd zhiwei

# 2. 一键启动
docker compose up -d

# 3. 打开浏览器访问 http://localhost:8080
```

## 适用场景

- **桥梁监测**：挠度、应变、振动、索力、交通荷载
- **建筑监测**：沉降、倾斜、裂缝、风压、地震响应
- **风机监测**：塔筒振动、叶片应变、基础沉降
- **铁路/轨道**：轨温、轨缝、道床沉降、车辆荷载

## 加入社区

止危是一个开源项目，欢迎提交 Issue、PR 与案例分享。

- [贡献指南](/developer/contribute)
- [联系我们](/community/contact)
