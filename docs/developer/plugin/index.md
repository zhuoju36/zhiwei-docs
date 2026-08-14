# 插件开发

止危支持通过插件机制扩展**协议适配器**与**分析算法**。两者都是 Python 实现，由后端启动时通过 `pkgutil` 自动扫描 `app/plugins/` 注册；社区插件还可以通过 Python `entry_points`（组 `shm_analyzers`）发布为独立的 PyPI 包。

## 插件类型

| 类型 | 位置 | 用途 | 状态 |
| --- | --- | --- | --- |
| 协议插件 | `app/plugins/protocols/` | 解析自定义设备数据格式 | 已实现（HTTP JSON / MQTT / Modbus TCP / Modbus RTU over TCP） |
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
- [后端模块](/developer/backend/)
- [贡献指南](/developer/contribute)