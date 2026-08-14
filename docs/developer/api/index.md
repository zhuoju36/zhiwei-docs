# 接口文档

止危后端提供 RESTful API，所有接口均遵循统一的请求与响应规范。

## 接口规范

- 基础路径：`/api/v1`
- 请求格式：`application/json`
- 认证方式：Bearer Token
- 响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

## 主要接口分类

| 分类 | 路径前缀 | 说明 |
| --- | --- | --- |
| 认证 | `/api/v1/auth` | 登录、登出、刷新 Token |
| 项目 | `/api/v1/projects` | 项目 CRUD |
| 结构物 | `/api/v1/structures` | 结构物管理 |
| 测点 | `/api/v1/points` | 测点管理 |
| 传感器 | `/api/v1/sensors` | 传感器与通道管理 |
| 数据 | `/api/v1/data` | 数据查询与导出 |
| 告警 | `/api/v1/alarms` | 告警规则与事件 |
| 报表 | `/api/v1/reports` | 报表模板与生成 |

## OpenAPI 文档

构建后可通过以下地址查看 Swagger UI：

```
http://localhost:3000/swagger
```

## 相关链接

- [后端模块](/developer/backend/)
- [前端模块](/developer/frontend/)
