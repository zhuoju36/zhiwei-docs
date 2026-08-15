# Kubernetes 部署

本文介绍如何在 Kubernetes 集群中部署止危后端，适用于生产环境。

> 当前仓库未自带 Helm Chart / K8s manifests（v0.9 路线图中）。本文给出可复制的最小化部署清单，生产环境请按需扩展（HPA / PDB / NetworkPolicy / cert-manager 等）。

## 前置条件

- Kubernetes 集群 >= 1.28
- kubectl 已配置
- Helm >= 3.12（可选，用于安装 cert-manager / ingress-nginx / prometheus 等）
- 已有的 StorageClass（推荐 SSD，用于 Postgres / TimescaleDB）

## 服务拓扑

| 组件 | 类型 | 副本 | 存储 | 备注 |
| --- | --- | --- | --- | --- |
| `api` | Deployment | 2+ | — | FastAPI，含 WebSocket |
| `worker` | Deployment | 2+ | — | Celery Worker，4 队列并发 |
| `collector` | DaemonSet / Deployment | 1+（按边缘节点） | EmptyDir / PVC（断网缓存） | 边缘采集进程（可选，中央采集场景不部署） |
| `postgres` | StatefulSet | 1 | PVC（推荐 SSD，≥ 100 GB） | timescale/timescaledb 镜像 |
| `redis` | Deployment | 1 | — | redis:7-alpine |
| `minio` | StatefulSet | 1 | PVC（≥ 500 GB） | 单节点即可，生产建议分布式 |
| `nginx` | Ingress | — | — | 反代 `/api/*` + `/ws/*`；可选 ingress-nginx |

> 生产 Postgres / Redis / MinIO 推荐用云厂商托管服务（RDS / ElastiCache / S3 兼容对象存储），K8s 内只跑 `api` + `worker`。

## 1. 命名空间与配置

```bash
kubectl create namespace shm
kubectl -n shm create configmap shm-config \
    --from-file=app.env=.env
kubectl -n shm create secret generic shm-secret \
    --from-literal=SECRET_KEY="$(openssl rand -hex 32)" \
    --from-literal=EDGE_API_KEY="$(openssl rand -hex 16)" \
    --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 16)" \
    --from-literal=MINIO_ROOT_PASSWORD="$(openssl rand -hex 16)"
```

## 2. PostgreSQL（StatefulSet）

参考 `timescale/timescaledb` 官方 Helm Chart 或 community manifests。生产推荐：

- 用云厂商托管 RDS（PG 15 + TimescaleDB 扩展）
- 通过 `Secret` 注入 DSN 到 API / Worker

最小化 StatefulSet（仅供参考，生产请用 Helm / Operator）：

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: shm
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels: { app: postgres }
  template:
    metadata:
      labels: { app: postgres }
    spec:
      containers:
        - name: postgres
          image: timescale/timescaledb:latest-pg15
          ports: [{ containerPort: 5432 }]
          env:
            - name: POSTGRES_DB
              value: shm_db
            - name: POSTGRES_USER
              value: shm_user
            - name: POSTGRES_PASSWORD
              valueFrom: { secretKeyRef: { name: shm-secret, key: POSTGRES_PASSWORD } }
          volumeMounts:
            - { name: data, mountPath: /var/lib/postgresql/data }
  volumeClaimTemplates:
    - metadata: { name: data }
      spec:
        accessModes: ["ReadWriteOnce"]
        resources: { requests: { storage: 100Gi } }
        storageClassName: ssd
```

## 3. API / Worker（Deployment）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shm-api
  namespace: shm
spec:
  replicas: 2
  selector:
    matchLabels: { app: shm-api }
  template:
    metadata:
      labels: { app: shm-api }
    spec:
      containers:
        - name: api
          image: ghcr.io/zhiwei-shm/shm-backend:0.9.0
          ports: [{ containerPort: 8000 }]
          envFrom:
            - configMapRef: { name: shm-config }
            - secretRef: { name: shm-secret }
          readinessProbe:
            httpGet: { path: /health, port: 8000 }
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet: { path: /health, port: 8000 }
            initialDelaySeconds: 30
            periodSeconds: 30
          resources:
            requests: { cpu: 500m, memory: 512Mi }
            limits:   { cpu: 2,    memory: 2Gi }
```

Worker 类似，把 `command` 改成：

```yaml
command: ["celery", "-A", "app.tasks.celery_app:celery_app", "worker",
          "-Q", "alerts,analysis,reports,maintenance", "-c", "4", "-l", "info"]
```

## Collector Deployment

边缘采集场景下增加的 `collector` 建议部署为 **DaemonSet**（每个边缘节点一个 Pod），也可用 Deployment 部署多副本做容灾。最小化清单：

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: shm-collector
  namespace: shm
spec:
  selector:
    matchLabels: { app: shm-collector }
  template:
    metadata:
      labels: { app: shm-collector }
    spec:
      containers:
        - name: collector
          image: ghcr.io/zhiwei-shm/shm-collector:1.0.0
          args: ["--config", "/etc/shm-collector/config.toml"]
          ports:
            - { containerPort: 9090, name: metrics }
          env:
            - name: SHM_COLLECTOR__SERVER__BACKEND_URL
              value: "http://shm-api:8000"
            - name: SHM_COLLECTOR__SERVER__API_KEY
              valueFrom: { secretKeyRef: { name: shm-secret, key: EDGE_API_KEY } }
          volumeMounts:
            - { name: config, mountPath: /etc/shm-collector, readOnly: true }
            - { name: buffer, mountPath: /var/lib/shm-collector }
          readinessProbe:
            httpGet: { path: /healthz, port: 9090 }
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits:   { cpu: 1,    memory: 512Mi }
      volumes:
        - name: config
          configMap: { name: shm-collector-config }
        - name: buffer
          emptyDir: {}   # 断网缓存：PVC 需 emptyDir.medium=Memory 或换 hostPath
```

`ConfigMap` 由 `config.toml` 生成：

```bash
kubectl -n shm create configmap shm-collector-config \
    --from-file=config.toml=./collector/config.toml
```

> 节点亲和性 / 反亲和性 / PodDisruptionBudget 等生产配置按需扩展。

## 4. 迁移流水线

部署顺序：

```bash
1. kubectl apply -f postgres.yaml redis.yaml minio.yaml
2. kubectl wait --for=condition=ready pod -l app=postgres -n shm
3. kubectl -n shm create job shm-migrate --image=ghcr.io/zhiwei-shm/shm-backend:0.9.0 \
       -- alembic upgrade head
4. kubectl -n shm create job shm-initdb --image=ghcr.io/zhiwei-shm/shm-backend:0.9.0 \
       -- python -m scripts.init_db
5. kubectl apply -f api.yaml worker.yaml ingress.yaml
```

生产推荐用独立的 Job 容器执行迁移，不要让 API 容器启动时自动跑迁移。

## 5. Ingress（Nginx）

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shm-ingress
  namespace: shm
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  ingressClassName: nginx
  rules:
    - host: shm.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service: { name: shm-api, port: { number: 8000 } }
          - path: /ws
            pathType: Prefix
            backend:
              service: { name: shm-api, port: { number: 8000 } }
```

WebSocket 需要长超时：`proxy-read-timeout` / `proxy-send-timeout` 调到 3600s。

## 6. 首次部署引导

`users` 表为空时需要创建第一个 admin。可在迁移 Job 之后额外起一个 Job：

```bash
ADMIN_USERNAME=admin \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD="$(openssl rand -hex 8)" \
kubectl -n shm create job shm-initadmin --image=ghcr.io/zhiwei-shm/shm-backend:0.9.0 \
    -- python -m scripts.init_admin --base-url http://shm-api:8000
```

## 生产建议

- 使用云厂商托管数据库（RDS / Cloud SQL）降低运维成本
- 配置 HPA 自动扩缩容（CPU > 70% 触发）
- 使用 cert-manager 自动管理 HTTPS 证书
- 配置 PodDisruptionBudget 保证服务可用性
- 启用 NetworkPolicy 限制 api / worker 仅与同 namespace 的 Postgres / Redis / MinIO 互通
- Prometheus + Grafana 监控（应用层用 `prometheus-fastapi-instrumentator`）

## 相关链接

- [Docker 部署](/deploy/docker)
- [配置项说明](/deploy/config)
- [备份与恢复](/deploy/backup)