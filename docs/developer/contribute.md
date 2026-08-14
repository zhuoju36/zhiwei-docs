# 贡献指南

感谢你对止危感兴趣！以下是参与项目的方式与规范。

## 参与方式

- 提交 Issue：反馈 Bug、提出功能建议
- 提交 PR：修复问题、新增功能、完善文档
- 分享案例：将你的监测项目经验写成 [实践案例](/examples/bridge)
- 回答问题：在 Issue 与讨论区帮助其他用户

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
- `style:` 代码格式调整
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建与工具

## 代码规范

- 前端：使用项目 ESLint / Prettier 配置
- 后端：遵循项目选定的语言规范
- 类型：优先使用 TypeScript 类型定义
- 测试：新增功能请补充对应测试

## 文档贡献

文档位于 `shm-docs/` 目录，使用 VitePress 编写。修改后请本地运行 `pnpm docs:dev` 预览。

## 行为准则

- 尊重他人，保持友善
- 讨论问题时聚焦事实与方案
- 遵守 MIT 协议与开源精神

## 相关链接

- [开发环境](/developer/environment)
- [接口文档](/developer/api/)
