# Kubernetes 部署

本文介绍如何在 Kubernetes 集群中部署止危，适用于生产环境。

## 前置条件

- Kubernetes 集群 >= 1.28
- kubectl 已配置
- Helm >= 3.12（可选）

## 部署方式

止危提供以下部署方式：

- 原生 YAML manifests
- Helm Chart（推荐）

## Helm 部署（推荐）

```bash
# 添加止危 Helm 仓库（待发布）
helm repo add zhiwei https://charts.zhiwei-shm.io
helm repo update

# 安装
helm install zhiwei zhiwei/zhiwei -f values.yaml
```

## 原生 YAML 部署

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/timescaledb.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

## 生产建议

- 使用云厂商托管数据库（RDS / Cloud SQL）降低运维成本
- 配置 HPA 自动扩缩容
- 使用 cert-manager 自动管理 HTTPS 证书
- 配置 PodDisruptionBudget 保证服务可用性

## 相关链接

- [Docker 部署](/deploy/docker)
- [配置项说明](/deploy/config)
- [备份与恢复](/deploy/backup)
