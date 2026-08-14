# 可视化看板

可视化看板用于把监测数据、告警状态与结构 3D 模型进行实时联动展示，适用于监控中心大屏。

## 功能概述

- 2D 看板：曲线、热力图、频谱图、统计表组件自由组合
- 3D 看板：上传 GLB 后基于 Three.js 加载；传感器位置以标记点叠加在模型上，按通道实时值着色
- WebSocket 实时推送：前端订阅项目频道后即时反映最新数据与告警
- 全屏模式：适用于监控中心大屏展示

## 操作步骤

### 创建看板

1. 进入「可视化看板」页面
2. 点击「新建看板」
3. 选择项目与模板
4. 添加图表组件并绑定通道
5. 调整布局后保存

### 上传与配置 3D 模型

1. 进入「项目管理」→ 目标项目 → 「3D 模型」标签
2. 上传模型文件（支持 OBJ / STL / PLY / glTF / GLB，最大 200 MB）
3. 系统通过 Celery `reports` 队列异步转换为 GLB
4. 状态变为 `success` 后，在 3D 看板中引用该模型
5. 在 3D 看板编辑模式下，将传感器的 `position` 与模型坐标对齐（标记点自动渲染）

### 全屏展示

1. 打开目标看板
2. 点击右上角「全屏」按钮
3. 按 `Esc` 退出全屏

## API 入口

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/v1/dashboard/stats` | `GET` | 聚合统计（活跃告警、按级别分布） |
| `/api/v1/dashboard/recent-alerts` | `GET` | 最近 N 条告警 |
| `/api/v1/models?project_id=` | `GET` | 项目下的 3D 模型列表 |
| `/api/v1/models/{id}/file` | `GET` | 下载 GLB（前端用 `GLTFLoader` 加载） |
| `/api/v1/data/latest/{channel_id}` | `GET` | 某通道最新值（前端轮询或 WebSocket 推送） |

## 实时刷新机制

- WebSocket 连接 `ws://<host>/ws/data?token=<JWT>`
- 连接成功后发送 `{type: "cmd:subscribe", project_id: <id>}`
- 服务端推送两类事件：
  - `data:realtime`：单条最新读数
  - `data:alert`：告警触发 / 更新 / 恢复

## 相关链接

- [项目管理](/user/project/)
- [数据采集与查看](/user/data/)
- [告警规则](/user/alarm/)