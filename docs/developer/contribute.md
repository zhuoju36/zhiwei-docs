# 贡献指南

感谢你对止危感兴趣！以下是参与项目的方式与规范。

## 参与方式

- **提交 Issue**：反馈 Bug、提出功能建议
- **提交 PR**：修复问题、新增功能、完善文档
- **分享案例**：把你的监测项目经验写成 [实践案例](/examples/bridge)
- **回答问题**：在 Issue 与讨论区帮助其他用户
- **开发插件**：发布新的协议适配器或分析算法

## 如果你来自高校 / 科研机构

平台对算法研究友好：分析插件契约 v2 已经稳定（`app/plugins/analyzers/base.py`），插件只做纯计算，不接触数据库与网络，便于学术复现。

- **算法实现为分析插件**：把模态识别（SSI-COV / ERA）、频域损伤识别、贝叶斯更新、神经网络等封装为 `AnalysisPlugin`，通过 `entry_points` 发布到 PyPI 或直接 PR 到 `app/plugins/analyzers/`，在管理后台 `GET /api/v1/analysis/plugins` 自动可见。
- **用平台数据做研究**：项目 / 通道 / 设备模型是标准化的，时序库（TimescaleDB hypertable）允许按窗口批量拉取历史数据复现实验；权限隔离保证只访问你参与的项目。
- **写复现案例**：把做过的模型试验 / 现场监测项目（桥梁缩尺、风电叶片、轨道、隧道）按 `examples/bridge.md` 的风格写成复现案例，含拓扑、传感器清单、告警阈值、跑出的图表。
- **提供公开数据集**：把发表过的 benchmark 数据（应变 / 加速度时序、模态振型等）整理成可导入止危的格式（CSV / NPZ），我们欢迎在 `examples/` 或独立数据仓库存放。
- **教学 / 课程资料**：让学生在沙箱项目里配设备、写告警规则、做 FFT，把讲义整理成教学材料放在 `community/`。

## 如果你来自设备厂商

平台已内置 HTTP JSON / MQTT / Modbus TCP / Modbus RTU over TCP 四种协议；如果你的设备不在其中，欢迎以协议插件形式补齐。

- **贡献协议适配器**：在`shm-collector/shm_collector/plugins/protocols/` 下新增 `<protocol>_adapter.py`，继承 `ProtocolAdapter` 实现 `connect / read_batch / disconnect`（监听型再加 `decode_stream`），启动时自动注册。
- **提供协议与寄存器文档**：把数采仪 / DTU / 智能传感器的通信协议整理成 Markdown，放到 `developer/protocol/` 下；集成商会非常感激——这正是他们在选型时缺的资料。
- **设备出厂默认配置**：建议在固件 / 出厂配置里预设好 `device_code` 与 `channel_code` 命名约定（如 `GW-XX-001` / `ACC-X`），让客户现场配置零编码。
- **联合案例**：把设备 + 止危的典型接入（接线、协议配置、看板）写成 `examples/<行业>.md`，真实参数、真实截图，比营销稿有用得多。
- **共建 OPC-UA 等长尾协议**：OPC-UA 已在路线图，欢迎提前实现并以 PR 形式提交参考适配器。
- **SDK / 网关开源**：如果有 SDK 或边缘网关代码，欢迎开源到组织仓库，集成商可以直接 fork 或引用。

## 如果你来自监测系统集成商

你们掌握项目从选型到运维的全链路经验，这是平台最稀缺的输入。

- **写实战案例**：把做过的项目（特别是踩过的坑——传感器选型、协议兼容、4G 网络抖动、断电恢复）按 `examples/bridge.md` 风格写出来，含拓扑、传感器清单、阈值经验值、告警配置。这些案例直接进文档首页推荐位。
- **贡献告警阈值经验值**：某类桥梁 / 建筑 / 风机的挠度、温度、加速度阈值是多少？整理成可复用模板，作为分析插件或看板默认配置。
- **反馈协议适配器的现实差异**：现场设备行为经常和协议手册不完全一致（寄存器顺序、字节序、CRC 异常处理）。把遇到的具体现象写成 Issue 或 PR，帮助修正适配器。
- **边缘部署 / 断网缓存配置**：把现场跑通过的 `shm-collector` TOML + Docker / K8s 清单贡献到 `deploy/` 或 `examples/`，重点是断网缓存 + 4G 弱网场景。
- **跨项目复用项目模板**：帮我们沉淀「行业项目模板」（如「某桥型标准项目结构 + 默认设备类型 + 告警规则集」），让新项目从模板克隆就能开干。
- **跟随版本升级**：v0.9 → v1.0 → v2.0 期间协议层在重构（v2 远期：从后端解耦，由 collector / 独立适配器包承载），你的反馈会影响 API 设计。

## 开发流程

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feat/xxx`
3. 提交代码：`git commit -m "feat: xxx"`
4. 推送分支：`git push origin feat/xxx`
5. 发起 Pull Request

## 提交规范

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

- `feat:` 新功能
- `fix:` 修复 Bug
- `docs:` 文档更新
- `refactor:` 重构
- `perf:` 性能优化
- `test:` 测试相关
- `chore:` 构建与工具

## 代码规范

### 后端（`shm-backend`）

完整规范见 [`shm-backend/AGENTS.md`](https://github.com/zhuoju36/zhiwei-backend/tree/main/AGENTS.md)（**最高优先级**）。要点：

- **异步铁律**：async 函数内禁止阻塞 IO；bcrypt 等 CPU 密集任务走 `loop.run_in_executor`
- **Pydantic v2**：请求 / 响应模型放在 `schemas/`；统一响应包装在 ASGI 中间件层
- **SQLAlchemy 2.0 async**：`Mapped[]` 风格；时序热路径（COPY）绕开 ORM 用 asyncpg 原生
- **错误处理**：业务异常用 `BizException`，路由层捕获后由中间件统一包装
- **提交前**：`ruff check --fix .` + `ruff format .` + `pytest`

### 前端（`shm-frontend`）

- Vue 3 组合式 API + `<script setup>`
- TypeScript 类型定义优先使用 `interface`
- API 请求统一封装到 `api/`，禁止组件直接 `axios.get`
- 样式优先使用 Element Plus / 项目已有组件

### 文档（`shm-docs`，本仓库）

- VitePress 1.6 语法（frontmatter + Markdown）
- 修改后本地运行 `pnpm docs:dev` 预览（端口 5174）
- 新增 / 重命名 / 删除页面后同步更新 `.vitepress/config.ts` 的侧边栏

## 测试要求

新增功能请补充对应测试：

- 后端：pytest + pytest-asyncio；fixture 见 `tests/conftest.py`
- 前端：组件测试与 E2E（vitest / playwright，规划中）
- 文档：本地构建 `pnpm docs:build` 验证无 VitePress 报错

## 文档贡献

文档位于 `shm-docs/` 目录，使用 VitePress 编写。修改后请本地运行：

```bash
cd shm-docs
pnpm install
pnpm docs:dev           # 本地预览（http://localhost:5174）
pnpm docs:build         # 生产构建（产出 docs/.vitepress/dist/）
```

修改 `docs/.vitepress/config.ts` 的导航与侧边栏时请保持与现有风格一致（侧边栏按用户手册 / 开发者 / 部署分组）。

## 行为准则

- 尊重他人，保持友善
- 讨论问题时聚焦事实与方案
- 遵守 MIT 协议与开源精神

## 相关链接

- [开发环境](/developer/environment)
- [接口文档](/developer/api/)
- [后端模块](/developer/backend/)
- [插件开发](/developer/plugin/)