# 前端开发规范

> 前端 v0.9 · 更新于 2026-08-16
>
> 本文补充前端 `AGENTS.md` 已给出的规则，给出更具体的实施细节与示例。AGENTS.md 是最高优先级；本文不与之冲突时可直接遵循。

## 1. Vue 3 与 TypeScript

- **必须使用 `<script setup lang="ts">`**，禁止 Options API
- **Props 定义**：使用 `defineProps<T>()` 配合接口，禁止 `defineProps({})` 无类型形式
- **Emits 定义**：使用 `defineEmits<T>()` 类型安全
- **组件名**：PascalCase，多单词（如 `PointPanel.vue`），禁止单单词（除根组件外）
- **文件路径别名**：`@/` 指向 `src/`，禁止相对路径超过两层（`../../`）

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Point } from '@/types'

interface Props {
  point: Point
  showLabel?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  showLabel: true
})

const emit = defineEmits<{
  select: [pointId: number]
  hover: [pointId: number | null]
}>()

const statusColor = computed(() => {
  const map = { normal: '#67C23A', warning: '#E6A23C', danger: '#F56C6C' }
  return map[props.point.status] || '#909399'
})
</script>
```

## 2. 状态管理（Pinia）

- **Store 必须是函数式定义**（Setup Store），禁止 Option Store
- **Store 职责单一**：`user.ts` 只存用户相关，`websocket.ts` 只管连接
- **禁止在 Store 中直接操作 DOM 或引入 Three.js 对象**

```typescript
// stores/websocket.ts
import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { DataMessage, AlertMessage } from '@/types'

export const useWebSocketStore = defineStore('websocket', () => {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const latestData = ref<Record<number, DataMessage>>({})
  const unreadAlerts = ref<AlertMessage[]>([])
  const currentProjectId = ref<number | null>(null)

  const connect = (token: string, projectId: number) => { /* ... */ }
  const disconnect = () => { /* ... */ }
  const subscribeProject = (projectId: number) => { /* ... */ }

  return {
    isConnected: readonly(isConnected),
    latestData: readonly(latestData),
    unreadAlerts,
    currentProjectId,
    connect,
    disconnect,
    subscribeProject,
  }
})
```

## 3. API 请求封装

```typescript
// api/request.ts
import axios from 'axios'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
})

// 请求拦截：注入 Token
request.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`
  }
  return config
})

// 响应拦截：统一错误处理 + Token 刷新
request.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    if (err.response?.status === 401) {
      const userStore = useUserStore()
      const refreshed = await userStore.refreshToken()
      if (!refreshed) {
        window.location.href = '/login'
        return Promise.reject(err)
      }
      err.config.headers.Authorization = `Bearer ${userStore.token}`
      return request(err.config)
    }
    ElMessage.error(err.response?.data?.message || '网络错误')
    return Promise.reject(err)
  }
)

export default request
```

## 4. Three.js 开发规范（核心）

### 4.1 架构原则

- **Three.js 对象禁止直接暴露在 Vue 响应式系统中**（会导致严重性能问题）
- 使用 **纯 TypeScript 类** 封装 Three.js 逻辑，Vue 组件仅作为容器和事件桥接
- 动画循环使用 `requestAnimationFrame`，**独立于 Vue 的更新周期**

### 4.2 场景管理器（SceneManager）

```typescript
// components/ThreeScene/SceneManager.ts
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class SceneManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private animationId: number = 0
  private resizeObserver: ResizeObserver | null = null

  constructor(private container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)

    const { clientWidth, clientHeight } = container
    this.camera = new THREE.PerspectiveCamera(45, clientWidth / clientHeight, 0.1, 1000)
    this.camera.position.set(20, 20, 20)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(clientWidth, clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05

    this.setupLights()
    this.resizeObserver = new ResizeObserver(() => this.onResize())
    this.resizeObserver.observe(container)
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)
    const directional = new THREE.DirectionalLight(0xffffff, 0.8)
    directional.position.set(10, 20, 10)
    this.scene.add(directional)
  }

  start() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  stop() {
    cancelAnimationFrame(this.animationId)
    this.resizeObserver?.disconnect()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }

  private onResize() {
    const { clientWidth, clientHeight } = this.container
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(clientWidth, clientHeight)
  }

  getScene() { return this.scene }
  getCamera() { return this.camera }
  getRenderer() { return this.renderer }
  getControls() { return this.controls }
}
```

### 4.3 测点管理器（PointManager）— 1000+ 测点优化

**核心挑战**：1000 个测点如果每个都是独立 Mesh，帧率会暴跌。必须使用 **InstancedMesh** 或合并几何体。

```typescript
// components/ThreeScene/PointManager.ts
import * as THREE from 'three'

export interface PointVisual {
  pointId: number
  position: THREE.Vector3
  status: 'normal' | 'warning' | 'danger'
  value: number
  name: string
}

export class PointManager {
  private scene: THREE.Scene
  private pointMap = new Map<number, PointVisual>()
  private instanceMesh: THREE.InstancedMesh | null = null
  private dummy = new THREE.Object3D()
  private colorNormal = new THREE.Color(0x67C23A)
  private colorWarning = new THREE.Color(0xE6A23C)
  private colorDanger = new THREE.Color(0xF56C6C)
  private raycastTargets: THREE.Mesh[] = []

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  initPoints(points: PointVisual[]) {
    this.clear()

    const geometry = new THREE.SphereGeometry(0.15, 8, 8)
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff })

    this.instanceMesh = new THREE.InstancedMesh(geometry, material, points.length)
    this.instanceMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.instanceMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(points.length * 3), 3
    )

    points.forEach((p, i) => {
      this.pointMap.set(p.pointId, p)
      this.dummy.position.copy(p.position)
      this.dummy.updateMatrix()
      this.instanceMesh!.setMatrixAt(i, this.dummy.matrix)
      this.instanceMesh!.setColorAt(i, this.getColor(p.status))

      // 不可见的射线检测代理（InstancedMesh 本身射线检测性能差）
      const proxy = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 4, 4),
        new THREE.MeshBasicMaterial({ visible: false })
      )
      proxy.position.copy(p.position)
      proxy.userData = { pointId: p.pointId, index: i }
      this.scene.add(proxy)
      this.raycastTargets.push(proxy)
    })

    this.instanceMesh.instanceMatrix.needsUpdate = true
    if (this.instanceMesh.instanceColor) {
      this.instanceMesh.instanceColor.needsUpdate = true
    }
    this.scene.add(this.instanceMesh)
  }

  updatePoint(pointId: number, value: number, status: 'normal' | 'warning' | 'danger') {
    const point = this.pointMap.get(pointId)
    if (!point || !this.instanceMesh) return

    point.value = value
    point.status = status

    const index = Array.from(this.pointMap.keys()).indexOf(pointId)
    this.instanceMesh.setColorAt(index, this.getColor(status))
    this.instanceMesh.instanceColor!.needsUpdate = true
  }

  getPointByRay(raycaster: THREE.Raycaster): PointVisual | null {
    const intersects = raycaster.intersectObjects(this.raycastTargets)
    if (intersects.length === 0) return null
    const pid = intersects[0].object.userData.pointId as number
    return this.pointMap.get(pid) || null
  }

  private getColor(status: string): THREE.Color {
    switch (status) {
      case 'warning': return this.colorWarning
      case 'danger': return this.colorDanger
      default: return this.colorNormal
    }
  }

  clear() {
    if (this.instanceMesh) {
      this.scene.remove(this.instanceMesh)
      this.instanceMesh.dispose()
      this.instanceMesh = null
    }
    this.raycastTargets.forEach(m => this.scene.remove(m))
    this.raycastTargets = []
    this.pointMap.clear()
  }
}
```

### 4.4 模型加载策略

```typescript
// components/ThreeScene/ModelLoader.ts
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

export class ModelLoader {
  private gltfLoader: GLTFLoader
  private objLoader: OBJLoader

  constructor() {
    this.gltfLoader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/')
    this.gltfLoader.setDRACOLoader(dracoLoader)
    this.objLoader = new OBJLoader()
  }

  async loadGLB(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(url, (gltf) => {
        const model = gltf.scene
        model.traverse((child) => {
          if (child.isMesh) {
            child.userData.ifcGuid = child.userData.ifc_guid || null
            child.userData.pointIds = child.userData.point_ids || []
          }
        })
        resolve(model)
      }, undefined, reject)
    })
  }

  async loadOBJ(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.objLoader.load(url, (group) => {
        resolve(group)
      }, undefined, reject)
    })
  }
}
```

### 4.5 Vue 组件集成

```vue
<!-- views/Dashboard/Scene3D.vue -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { SceneManager } from '@/components/ThreeScene/SceneManager'
import { PointManager } from '@/components/ThreeScene/PointManager'
import { ModelLoader } from '@/components/ThreeScene/ModelLoader'
import { useWebSocketStore } from '@/stores/websocket'
import type { PointVisual } from '@/types'

const containerRef = ref<HTMLDivElement>()
const sceneManager = ref<SceneManager>()
const pointManager = ref<PointManager>()
const wsStore = useWebSocketStore()

// 监听 WebSocket 实时数据，更新测点颜色
watch(() => wsStore.latestData, (dataMap) => {
  if (!pointManager.value) return
  Object.values(dataMap).forEach((msg: any) => {
    pointManager.value!.updatePoint(msg.point_id, msg.value, msg.status)
  })
}, { deep: true })

onMounted(async () => {
  if (!containerRef.value) return

  const sm = new SceneManager(containerRef.value)
  sceneManager.value = sm
  sm.start()

  const loader = new ModelLoader()
  const model = await loader.loadGLB('/api/v1/models/1/building.glb')
  sm.getScene().add(model)

  const pm = new PointManager(sm.getScene())
  pointManager.value = pm

  setupInteraction(sm, pm)
})

onBeforeUnmount(() => {
  pointManager.value?.clear()
  sceneManager.value?.stop()
})

function setupInteraction(sm: SceneManager, pm: PointManager) {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  sm.getRenderer().domElement.addEventListener('click', (event) => {
    const rect = sm.getRenderer().domElement.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 - 1

    raycaster.setFromCamera(mouse, sm.getCamera())
    const point = pm.getPointByRay(raycaster)
    if (point) {
      // emit('select-point', point.pointId)
    }
  })
}
</script>

<template>
  <div ref="containerRef" class="scene-container" />
</template>

<style scoped>
.scene-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}
</style>
```

## 5. WebSocket 开发规范

### 5.1 composables/useWebSocket.ts

```typescript
import { ref, readonly } from 'vue'
import { useUserStore } from '@/stores/user'

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'wss://localhost/ws'

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const reconnectCount = ref(0)
  const MAX_RECONNECT = 5
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const connect = () => {
    const userStore = useUserStore()
    if (!userStore.token) return

    const url = `${WS_BASE_URL}/data?token=${userStore.token}`
    ws.value = new WebSocket(url)

    ws.value.onopen = () => {
      isConnected.value = true
      reconnectCount.value = 0
      startHeartbeat()
    }

    ws.value.onmessage = (event) => {
      const message = JSON.parse(event.data)
      handleMessage(message)
    }

    ws.value.onclose = () => {
      isConnected.value = false
      stopHeartbeat()
      if (reconnectCount.value < MAX_RECONNECT) {
        reconnectTimer = setTimeout(() => {
          reconnectCount.value++
          connect()
        }, 3000 * reconnectCount.value)
      }
    }

    ws.value.onerror = (err) => {
      console.error('WebSocket error:', err)
      ws.value?.close()
    }
  }

  const disconnect = () => {
    stopHeartbeat()
    if (reconnectTimer) clearTimeout(reconnectTimer)
    ws.value?.close()
    ws.value = null
  }

  const startHeartbeat = () => {
    heartbeatTimer = setInterval(() => {
      if (ws.value?.readyState === WebSocket.OPEN) {
        ws.value.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }

  const stopHeartbeat = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
  }

  const subscribeProject = (projectId: number) => {
    send({ type: 'cmd:subscribe', project_id: projectId })
  }

  const send = (data: object) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(data))
    }
  }

  const handleMessage = (msg: any) => {
    switch (msg.type) {
      case 'data:realtime':
        // 更新 dashboard store（payload: channel_id/device_code/channel_code/value/unit/quality/timestamp）
        break
      case 'data:alert':
        // 活跃告警列表 + ElNotification（payload 含 status: triggered|updated|resolved）
        break
      case 'cmd:subscribed':
        // 记录当前订阅 project_id
        break
      case 'cmd:error':
        // 订阅被拒绝（如 FORBIDDEN），连接保持打开
        break
    }
  }

  return {
    isConnected: readonly(isConnected),
    connect,
    disconnect,
    subscribeProject,
    send,
  }
}
```

### 5.2 与 Pinia 集成

```typescript
// stores/websocket.ts
import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import { useWebSocket } from '@/composables/useWebSocket'

export const useWebSocketStore = defineStore('websocket', () => {
  const { connect, disconnect, subscribeProject, isConnected } = useWebSocket()
  const latestData = ref<Record<number, any>>({})
  const alerts = ref<any[]>([])

  return {
    isConnected: readonly(isConnected),
    latestData: readonly(latestData),
    alerts: readonly(alerts),
    connect,
    disconnect,
    subscribeProject,
  }
})
```

> **注意**：后端当前不实现心跳 / pong，前端可以发 `ping` 但收不到 `pong`——心跳仅用于防止中间代理（nginx）超时切断 WebSocket 链接。

## 6. 数据分析页面规范

### 6.1 时序曲线组件（TimeSeries.vue）

```vue
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, DataZoomComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, DataZoomComponent])

interface Props {
  pointIds: number[]
  startTime: string
  endTime: string
  interval: string  // 1s, 1m, 1h
}
const props = defineProps<Props>()

const chartOption = ref({})
const loading = ref(false)

const fetchData = async () => {
  loading.value = true
  const results = await Promise.all(
    props.pointIds.map(id =>
      api.data.getTimeseries({ point_id: id, start: props.startTime, end: props.endTime, interval: props.interval })
    )
  )
  // 组装 ECharts option
  loading.value = false
}

watch(() => [props.startTime, props.endTime, props.interval], fetchData, { immediate: true })
</script>

<template>
  <v-chart class="chart" :option="chartOption" autoresize v-loading="loading" />
</template>
```

### 6.2 性能优化

- **数据量控制**：单次查询返回点数不超过 5000，超出时后端自动降采样
- **图表销毁**：页面切换时调用 `echarts.dispose()`，避免内存泄漏
- **虚拟滚动**：历史数据表格使用 `el-table` 的虚拟滚动或 `vxe-table`

## 7. 权限与路由

### 7.1 路由元信息

```typescript
// router/routes.ts
import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    component: () => import('@/views/Dashboard/Index.vue'),
    meta: { requiresAuth: true, title: '数据大屏' }
  },
  {
    path: '/analysis',
    component: () => import('@/views/Analysis/Index.vue'),
    meta: { requiresAuth: true, title: '数据分析' }
  },
  {
    path: '/admin',
    component: () => import('@/views/Admin/Index.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, title: '管理后台' },
    children: [
      { path: 'users', component: () => import('@/views/Admin/UserManage.vue') },
      { path: 'devices', component: () => import('@/views/Admin/DeviceManage.vue') },
      { path: 'projects', component: () => import('@/views/Admin/ProjectManage.vue') },
    ]
  },
]
```

### 7.2 导航守卫

```typescript
// router/index.ts
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
    return
  }

  if (to.meta.requiresAdmin && userStore.role !== 'admin') {
    next('/403')
    return
  }

  next()
})
```

### 7.3 组件级权限

```vue
<!-- components/Common/PermissionWrapper.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  role?: string        // 'admin' | 'user'
  projectId?: number   // 检查用户是否有该项目权限
}>()

const userStore = useUserStore()
const hasPermission = computed(() => {
  if (props.role && userStore.role !== props.role) return false
  return true
})
</script>

<template>
  <slot v-if="hasPermission" />
  <slot v-else name="fallback">
    <el-empty description="无权限访问" />
  </slot>
</template>
```

## 8. Nginx 配置

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # 前端路由 history 模式支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理到后端
    location /api/ {
        proxy_pass http://api:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket 代理
    location /ws/ {
        proxy_pass http://api:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 3D 模型文件大文件传输
    location /api/v1/models/ {
        proxy_pass http://api:8000/api/v1/models/;
        proxy_buffering off;
        proxy_max_temp_file_size 0;
    }
}
```

## 9. 反模式清单

| 反模式 | 后果 | 正确做法 |
|--------|------|----------|
| Three.js 对象放入 Vue `ref`/`reactive` | 严重性能损耗，帧率暴跌 | 使用纯 TS 类管理，Vue 仅持有管理器引用 |
| 在 `requestAnimationFrame` 中读取 Vue 响应式状态 | 触发大量依赖追踪 | 将数据抽离到普通对象，每帧手动同步 |
| WebSocket 消息直接修改组件局部状态 | 跨组件数据不同步 | 统一写入 Pinia Store，组件读取 Store |
| 1000 个测点用 1000 个独立 Mesh | 渲染卡顿（< 10 FPS） | 使用 `InstancedMesh` 批量渲染 |
| 同时加载多个大型 3D 模型 | 内存溢出、页面卡死 | 按需加载、Draco 压缩、LOD 策略 |
| 在模板中直接调用 API | 难以复用、测试困难 | 封装到 composable 或 store action |
| 忽略 ECharts 实例销毁 | 内存泄漏，页面切换后图表残留 | `onBeforeUnmount` 中调用 `dispose()` |
| 使用 `v-if` 频繁切换 Three.js 容器 | 场景反复重建，资源泄漏 | 使用 `v-show` 或手动控制可见性 |
| 前端直接解析 IFC 文件 | 文件大时主线程阻塞数秒 | 后端预转换为 GLB，前端只加载 GLB |
| 忽略 TypeScript `strict` 模式 | 运行时类型错误频发 | `tsconfig.json` 开启 `strict: true` |
| 测试 mock 编码假设而非真实库契约 | 真实路径从未触达 | 协议 / WS / API 等接外部的代码必须基于真实库或 simulator 冒烟 |

## 相关链接

- 前端模块（架构与目录结构）：[前端模块](/developer/frontend/)
- 后端 API：[接口文档](/developer/api/)
- 数据采集器（边缘采集）：[数据采集器](/developer/collector/)
- 前端 AGENTS.md（仓库内，最高优先级）