# 插件开发

止危支持通过插件机制扩展协议解析器、特征值算法与可视化组件。

## 插件类型

| 类型 | 说明 |
| --- | --- |
| 协议插件 | 解析自定义设备数据格式 |
| 算法插件 | 实现自定义特征值或分析算法 |
| 可视化插件 | 在看板中添加自定义图表组件 |

## 协议插件示例

```typescript
// plugins/my-protocol/index.ts
export default defineProtocolPlugin({
  name: 'my-protocol',
  version: '1.0.0',
  parse(payload: Buffer) {
    // 解析设备原始报文
    return {
      deviceId: 'xxx',
      timestamp: Date.now(),
      points: [
        { pointCode: 'P-001', channelCode: 'CH-001', value: 0.0 }
      ]
    }
  }
})
```

## 算法插件示例

```typescript
// plugins/my-algorithm/index.ts
export default defineAlgorithmPlugin({
  name: 'rms',
  version: '1.0.0',
  compute(samples: number[]) {
    const sum = samples.reduce((a, b) => a + b * b, 0)
    return Math.sqrt(sum / samples.length)
  }
})
```

## 插件发布

1. 将插件代码放入 `plugins/` 目录
2. 在平台管理后台注册插件
3. 将插件绑定到对应设备或测点

## 相关链接

- [接入协议](/developer/protocol/)
- [后端模块](/developer/backend/)
