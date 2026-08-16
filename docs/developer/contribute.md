# 贡献指南

感谢你对止危感兴趣！以下是参与项目的方式与规范。

## 参与方式

- **提交 Issue**：反馈 Bug、提出功能建议
- **提交 PR**：修复问题、新增功能、完善文档
- **分享案例**：把你的监测项目经验写成 [实践案例](/examples/bridge)
- **回答问题**：在 Issue 与讨论区帮助其他用户
- **开发插件**：发布新的协议适配器或分析算法

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