# 插件开发

止危支持通过插件机制扩展**协议适配器**与**分析算法**。两者都是 Python 实现，由后端启动时通过 `pkgutil` 自动扫描 `app/plugins/` 注册；社区插件还可以通过 Python `entry_points`（组 `shm_analyzers`）发布为独立的 PyPI 包。

## 插件类型

| 类型 | 位置 | 用途 | 状态 |
| --- | --- | --- | --- |
| 协议插件（中央采集） | `app/plugins/protocols/` | 解析自定义设备数据格式，运行在后端进程内 | 已实现（HTTP JSON / MQTT / Modbus TCP / Modbus RTU over TCP） |
| 协议插件（边缘采集） | `shm-collector/shm_collector/plugins/protocols/` | 同上，运行在独立 collector 进程内；**接口签名一致但代码独立** | 详见 [数据采集器](/developer/collector/) |
| 分析插件 | `app/plugins/analyzers/` | 实现自定义特征值或分析算法（FFT / statistics 等） | 已实现（FFT / statistics） |
| 可视化组件 | 前端 `shm-frontend/src/components/` | 在看板中添加自定义图表 | 走前端 Vue 组件而非后端插件 |

## 协议插件开发

`shm-backend/app/plugins/protocols/base.py` 定义了稳定的抽象接口（**禁止修改**）：

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any, List


@dataclass
class RawReading:
    device_code: str
    channel_code: str
    timestamp: datetime
    value: float
    unit: str
    quality: str = "good"
    raw_bytes: bytes = b""


class ProtocolAdapter(ABC):
    name: str = "base"
    version: str = "1.0"

    @abstractmethod
    async def connect(self) -> None: ...
    @abstractmethod
    async def read_batch(self) -> List[RawReading]: ...
    @abstractmethod
    async def disconnect(self) -> None: ...

    async def health_check(self) -> bool:
        return getattr(self, "_connected", False)
```

新增协议步骤：

1. 在 `app/plugins/protocols/` 下新建 `<protocol>_adapter.py`
2. 继承 `ProtocolAdapter`，设置 `name = "<protocol>"`（与 `devices.protocol` 字段一致）
3. 实现 `connect / read_batch / disconnect`
4. 监听型适配器（DTU 等）额外设 `supports_listen = True` 并实现 `decode_stream`，无需 `connect` 语义
5. 进程启动时 `AdapterRegistry.discover()` 自动注册

## 分析插件开发

`shm-backend/app/plugins/analyzers/base.py` 定义了稳定的接口契约 v2（**禁止修改**）：

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class AnalysisInput:
    channel_ids: list[int]
    data: Dict[int, Any]                # channel_id -> numpy array
    sampling_rate: float
    start: Optional[str] = None
    end: Optional[str] = None


@dataclass
class AnalysisOutput:
    summary: Dict[str, Any] = field(default_factory=dict)
    artifact: Optional[bytes] = None    # NPZ / JSON / 图片
    artifact_name: str = "result.bin"
    artifact_type: str = "application/octet-stream"


class AnalysisPlugin(ABC):
    name: str = "base"
    display_name: str = "Base"
    description: str = ""
    version: str = "1.0.0"
    input_channels: int = 1
    min_samples: int = 2
    params_schema: Dict[str, Any] = {}

    @abstractmethod
    async def analyze(self, data: AnalysisInput, config: dict) -> AnalysisOutput:
        ...
```

新增分析插件步骤（**内置**）：

1. 在 `app/plugins/analyzers/` 下新建 `<name>.py`
2. 继承 `AnalysisPlugin`，声明 `name / display_name / input_channels / min_samples / params_schema`
3. 实现 `async def analyze(self, data, config)`
4. 重启 API 即可通过 `GET /api/v1/analysis/plugins` 看到新插件

### 通过 entry_points 发布（社区）

打包 `pyproject.toml`：

```toml
[project]
name = "shm-analyzer-myplugin"
version = "0.1.0"
dependencies = ["shm-backend"]

[project.entry-points."shm_analyzers"]
myplugin = "shm_analyzer_myplugin.plugin:MyPlugin"
```

`pip install shm-analyzer-myplugin` 后重启 API 即可加载，无需修改 `shm-backend` 源码。

### 简单示例

```python
# shm-backend/app/plugins/analyzers/statistics.py
import numpy as np
from .base import AnalysisPlugin, AnalysisInput, AnalysisOutput


class StatisticsPlugin(AnalysisPlugin):
    name = "statistics"
    display_name = "基础统计"
    description = "对通道样本计算 max / min / avg / rms"
    version = "1.0.0"
    input_channels = 1
    min_samples = 1
    params_schema = {
        "type": "object",
        "properties": {},
    }

    async def analyze(self, data: AnalysisInput, config: dict) -> AnalysisOutput:
        arr = next(iter(data.data.values()))
        return AnalysisOutput(
            summary={
                "max": float(np.max(arr)),
                "min": float(np.min(arr)),
                "avg": float(np.mean(arr)),
                "rms": float(np.sqrt(np.mean(arr ** 2))),
                "num_samples": int(arr.size),
            }
        )
```

### 插件契约要点

- 插件是**纯计算单元**：不接触数据库，不订阅实时流
- 参数校验失败抛 `ValueError` → 任务标记 `failed`
- 多通道插件：`input_channels > 1`，`data.data` 是 `Dict[channel_id, np.ndarray]`
- 结果返回 `summary`（JSON，前端直接展示）+ 可选 `artifact`（二进制附件，存 MinIO）

## 插件发布（社区）

1. 内部插件直接放 `app/plugins/` 即可
2. 社区插件打包 PyPI，声明 entry point（组 `shm_analyzers`）
3. 在管理后台登记插件信息（可选）

## 相关链接

- [接入协议](/developer/protocol/)
- [数据采集器](/developer/collector/)：边缘采集场景下的协议插件位置
- [后端模块](/developer/backend/)
- [贡献指南](/developer/contribute)

---

## 分析插件社区版

> v0.8d · 更新于 2026-08-16
>
> 本节面向想在 SHM 平台发布自定义分析算法的开发者。读完本文（约 10 分钟）+ 复制一个示例即可完成首个插件。

### 1. 插件是什么

分析插件 = **纯计算单元**：输入「数组 + 参数」，输出「JSON 摘要 + 可选附件」。

```
提交任务 → 框架拉取历史数据 → 你的插件 analyze() → 摘要入库 / 附件存 MinIO → 前端展示
```

框架负责：数据访问、权限校验、任务状态机、结果存储。**你的插件不需要接触数据库、网络、实时流**——只需写数学。

### 2. 最小插件（5 分钟）

在 `app/plugins/analyzers/` 下新建 `my_plugin.py`：

```python
from typing import Any

import numpy as np

from app.plugins.analyzers.base import AnalysisInput, AnalysisOutput, AnalysisPlugin


class MyPlugin(AnalysisPlugin):
    # —— 元信息（注册表 / 前端列表与表单用）——
    name = "my_plugin"  # 唯一标识，提交任务时用这个名字
    display_name = "我的分析"  # 前端展示名
    description = "一句话说明这个算法干什么"
    version = "1.0.0"
    input_channels = 1  # 需要几个通道的数据（模态分析可设为 N）
    min_samples = 2  # 每个通道最少样本数（不足则任务失败）
    result_view = "generic"  # 前端结果展示视图：generic（摘要+下载）/ fft（频谱图）
    params_schema = {  # JSON Schema：前端据此生成参数表单
        "type": "object",
        "properties": {
            "window": {"type": "integer", "minimum": 1, "default": 10},
        },
    }

    async def analyze(self, data: AnalysisInput, config: dict[str, Any]) -> AnalysisOutput:
        arr = np.asarray(data.data, dtype=np.float64)  # 单通道时 data.data 是数组
        window = int(config.get("window", 10))  # 参数从 config 读，自行校验
        if window <= 0:
            raise ValueError("window 必须 > 0")  # 抛 ValueError → 任务标记 failed

        return AnalysisOutput(
            summary={
                "channel_id": data.channel_ids[0],
                "window": window,
                "mean": float(arr.mean()),
            },
            # 可选：二进制附件（NPZ/PNG/CSV...）→ MinIO，前端可下载
            # artifact=np.savez(...).tobytes(),
            # artifact_name=f"my_{data.channel_ids[0]}.npz",
        )
```

保存后无需任何注册动作——**进程启动时自动扫描发现**。重启服务，`GET /api/v1/analysis/plugins` 就能看到它。

### 3. 接口契约（v2）

### AnalysisInput（框架构造，你只读）

| 字段 | 说明 |
|------|------|
| `channel_ids: list[int]` | 参与分析的通道 ID（多通道插件由提交者经 `params.channel_ids` 指定） |
| `time_range: tuple[str, str]` | 时间窗（ISO 字符串，可空） |
| `sampling_rate: float` | 采样率（Hz），取自通道配置；fft 等可通过 config 覆盖 |
| `data` | `input_channels=1`：`np.ndarray`（等间隔采样）；`input_channels=N`：`dict[int, np.ndarray]`（channel_id → 数组） |

### AnalysisOutput（你返回）

| 字段 | 说明 |
|------|------|
| `summary: dict` | JSON 摘要 → 存入任务 `result_summary`（必须 JSON 可序列化） |
| `artifact: bytes \| None` | 可选二进制附件 → 存 MinIO，`GET /analysis/jobs/{id}/result` 可下载 |
| `artifact_name: str` | 附件文件名（含扩展名，决定下载文件名） |
| `artifact_type: str` | 附件 Content-Type |

### 规则

- `analyze` 必须返回 `AnalysisOutput`（不是裸 dict）
- 参数校验失败抛 `ValueError`（框架捕获后任务标记 `failed` 并记录错误信息）
- 摘要/附件都要**JSON/二进制友好**，不要返回 numpy 对象直接入库

### 4. 多通道插件（模态分析等）

声明 `input_channels = N`，提交任务时 `params.channel_ids` 给出 N 个通道：

```python
class ModalPlugin(AnalysisPlugin):
    name = "modal"
    input_channels = 4  # 同项目 4 个通道同步分析

    async def analyze(self, data: AnalysisInput, config):
        arrays = data.data  # {channel_id: np.ndarray}
        # 各通道样本数可能不同，自行对齐/截断
        return AnalysisOutput(summary={...})
```

约束：多通道必须属于**同一项目**（框架校验，防止越权跨项目拉数据）。

### 5. 发布为第三方包（pip install 即接入）

不想改核心仓库？把你的插件打包成独立 Python 包，声明 entry point：

```toml
# pyproject.toml
[project]
name = "shm-plugin-myanalysis"
version = "1.0.0"
requires-python = ">=3.11"

[project.entry-points."shm_analyzers"]
myanalysis = "myanalysis:MyPlugin"   # 模块:类
```

部署端 `pip install shm-plugin-myanalysis` 后，后端启动时通过 `importlib.metadata.entry_points(group="shm_analyzers")` 自动注册——**无需改任何核心代码**。

### 版本守卫

- 插件须声明 `plugin_api_version = "1"`（当前框架接口版本，见 `app/plugins/analyzers/base.py` 的 `PLUGIN_API_VERSION`）
- 版本不匹配的插件会被拒绝加载并记 warning（防止框架升级后插件静默出错）
- 同名插件：先注册的生效（内置优先），重复的记 warning 跳过

### 6. 本地测试

```python
import asyncio
import numpy as np
from app.plugins.analyzers.my_plugin import MyPlugin
from app.plugins.analyzers.base import AnalysisInput


async def main():
    out = await MyPlugin().analyze(
        AnalysisInput(
            channel_ids=[1],
            time_range=("", ""),
            sampling_rate=100.0,
            data=np.sin(2 * np.pi * 5 * np.arange(200) / 100),
        ),
        {"window": 10},
    )
    print(out.summary)


asyncio.run(main())
```

插件是纯函数，单测喂假数组即可，无需数据库/Redis/MinIO。

### 7. 内置换 / 换清单

| 任务 | 位置 |
|------|------|
| 接口契约 | `app/plugins/analyzers/base.py`（**契约变更需同步本指南与文档**） |
| 注册表 | `app/plugins/analyzers/registry.py`（内置扫描 + entry_points） |
| 数据拉取/调度 | `app/tasks/analysis_tasks.py` |
| 元信息接口 | `GET /api/v1/analysis/plugins` |
| 示例插件 | `statistics.py`（最小）、`fft_analysis.py`（带附件） |

### 8. 常见问题

- **插件没出现在 `/analysis/plugins`**：检查类是否继承 `AnalysisPlugin`、`name` 是否重复、`plugin_api_version` 是否匹配
- **任务一直 failed**：`GET /analysis/jobs/{id}` 的 `error` 字段有具体原因；参数校验失败时确认 `ValueError` 消息
- **多通道数据长度不一致**：框架不强行对齐，插件自行处理（可 `min` 截断或重采样）