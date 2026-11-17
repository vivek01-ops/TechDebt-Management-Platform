# Local Argo CD Deployment (Kubernetes)

Yes, you can deploy this project locally using **Argo CD** on a local Kubernetes cluster (kind, minikube, k3d, or Docker Desktop Kubernetes).

> "argi cd" in the request is interpreted as **Argo CD**.

## What’s included
Starter Kubernetes manifests are provided in `deploy/k8s/`:
- `namespace.yaml`, `config.yaml` (ConfigMap/Secret), `postgres.yaml`, `redis.yaml`
- `backend.yaml` (API + worker deployments, service), `frontend.yaml` (UI deployment, service)
- `kustomization.yaml` (for `kubectl apply -k` or Argo CD Kustomize source)

These are intended for **local/dev** use (dev servers, NodePort services, `emptyDir` Postgres storage, default credentials). Harden for shared/production use.

## Prerequisites
- Docker
- Local Kubernetes cluster: **kind**, **minikube**, **k3d**, or Docker Desktop Kubernetes
- `kubectl` configured for the cluster
- **Argo CD** installed in the cluster
- (For Argo CD GitOps flow) a Git repository containing this project/manifests

## 1) Create a local cluster (examples)
**kind:**
```bash
kind create cluster --name techdebt
```
**minikube:**
```bash
minikube start
```

## 2) Build container images and make them available to the cluster
From the project root:

```bash
docker build -t techdebt-backend:local ./backend
docker build -t techdebt-frontend:local ./frontend
```

Load images into the cluster:
- **kind:** `kind load docker-image techdebt-backend:local techdebt-frontend:local --name techdebt`
- **minikube:** `minikube image load techdebt-backend:local && minikube image load techdebt-frontend:local`
- **Docker Desktop K8s:** locally built images are usually available directly.

> Alternative: push images to a registry and update `image:` (and remove/adjust `imagePullPolicy`) in `deploy/k8s/backend.yaml` and `deploy/k8s/frontend.yaml`.

## 3) Install Argo CD (if not installed)
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
```

Access Argo CD UI (port-forward):
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
# UI: https://localhost:8080 (accept self-signed cert)
```
Get initial admin password:
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
# user: admin
```

## 4) Deploy the app

### Option A — Quick deploy with kubectl (no Argo CD sync required)
```bash
kubectl apply -k deploy/k8s
kubectl get pods -n techdebt -w
```

### Option B — Deploy via Argo CD (GitOps)
Argo CD typically syncs from a **Git repository**. Ensure `deploy/k8s/` is committed and pushed to a repo Argo CD can reach.

1. Initialize/push repo if needed:
   ```bash
   git init
   git add .
   git commit -m "Add app and k8s manifests"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Create an Argo CD Application (UI or CLI). Example CLI:
   ```bash
   argocd login localhost:8080 --username admin --password <password> --insecure

   argocd app create techdebt \
     --repo <your-repo-url> \
     --path deploy/k8s \
     --dest-server https://kubernetes.default.svc \
     --dest-namespace techdebt \
     --sync-policy automated --self-heal --auto-prune
   ```
3. Sync/status:
   ```bash
   argocd app sync techdebt
   argocd app get techdebt
   ```

> For a purely local repo without remote push, you can run a local Git server or configure Argo CD to access a mounted/local repo; using a hosted/local-network Git repo is usually simplest.

## 5) Access the application
Manifests expose NodePort services:
- **Frontend UI:** `http://<node-ip>:30173` (login at `/login`)
- **Backend API:** `http://<node-ip>:30080` (`/health`, `/docs`)

Get node IP/URL:
- **minikube:** `minikube service frontend -n techdebt --url` (and/or backend)
- **kind/Docker Desktop:** often `http://localhost:30173` and `http://localhost:30080` (or use port-forward)

Port-forward alternative:
```bash
kubectl port-forward svc/frontend -n techdebt 5173:5173
kubectl port-forward svc/backend -n techdebt 8000:8000
# UI: http://localhost:5173
```

## 6) Notes
- **Images:** manifests reference `techdebt-backend:local` and `techdebt-frontend:local` with `imagePullPolicy: IfNotPresent`. Rebuild and reload images after code changes, then restart deployments: `kubectl rollout restart deployment/backend deployment/worker deployment/frontend -n techdebt`.
- **Storage/config:** Postgres uses `emptyDir` (ephemeral). For persistence, replace with a PVC/StatefulSet. Update secrets/config in `deploy/k8s/config.yaml` as needed.
- **AWS portal login:** sign in from the UI with Access Key ID / Secret Access Key (read-only). Cluster nodes must have network access to AWS APIs and lifecycle sources.
- **Scope:** this is a local/dev starting point (Vite dev server, dev backend command). For a production-style deployment, use production frontend builds, ingress/TLS, proper secrets management, persistent DB storage, and resource/security hardening.
