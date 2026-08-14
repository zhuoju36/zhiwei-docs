# 报表与导出

止危当前不提供独立的报表中心，但所有数据均可通过 API 拉取后由前端或 BI 工具自由组装。规划中的报表模板 / 定时生成 / 邮件推送（Celery `reports` 队列）将在 v0.9 后续版本落地。

## 现状

- **历史数据**：通过 `GET /api/v1/data/timeseries` 按通道 + 时间范围 + 聚合粒度拉取
- **告警事件**：通过 `GET /api/v1/alerts` 拉取，配合筛选条件
- **3D 模型附件**：通过 `GET /api/v1/analysis/jobs/{id}/result` 下载 NPZ 等分析附件
- **导出格式**：CSV / Excel / JSON 取决于前端实现

## 自助导出

### 通道历史数据

```bash
curl -G http://localhost:8000/api/v1/data/timeseries \
    -H "Authorization: Bearer $TOKEN" \
    --data-urlencode "channel_id=1" \
    --data-urlencode "start=2026-08-01T00:00:00Z" \
    --data-urlencode "end=2026-08-08T00:00:00Z" \
    --data-urlencode "interval=1h" \
    --data-urlencode "format=json"
```

返回结构：

```json
{
  "code": "OK",
  "data": {
    "channel_id": 1,
    "interval": "1h",
    "data": [
      {"ts": "2026-08-01T00:00:00Z", "value": 0.12, "avg_val": 0.10, "max_val": 0.42, "min_val": -0.31, "rms_val": 0.18},
      ...
    ]
  }
}
```

### 告警清单

```bash
curl -G http://localhost:8000/api/v1/alerts \
    -H "Authorization: Bearer $TOKEN" \
    --data-urlencode "project_id=1" \
    --data-urlencode "start=2026-08-01T00:00:00Z" \
    --data-urlencode "end=2026-08-08T00:00:00Z"
```

### 分析任务附件

```bash
curl -o fft.npz http://localhost:8000/api/v1/analysis/jobs/42/result \
    -H "Authorization: Bearer $TOKEN"
```

`fft.npz` 为 NPZ 格式，可用 `numpy.load(BytesIO(content))` 解析。

## 规划中

- 内置日报 / 周报 / 月报模板
- 定时生成 + 邮件 / Webhook 推送（Celery `reports` 队列）
- 与大屏组件复用模板编辑器
- 数据归档到 MinIO 后离线查询

## 相关链接

- [数据采集与查看](/user/data/)
- [告警规则](/user/alarm/)
- [可视化看板](/user/dashboard/)