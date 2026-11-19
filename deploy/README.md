# Deployment (Kubernetes & Argo CD GitOps)

This directory contains deployment assets for running TechDebt Management Platform on Kubernetes, including **raw manifests (Kustomize)**, a **Helm chart**, and **Argo CD Application** definitions for a GitOps workflow.

## Structure

- `k8s/` – Raw Kubernetes manifests (Kustomize base)
  - Namespace, ConfigMap/Secret, Postgres (PVC + Deployment + Service), Redis, Backend, Worker, Frontend, Ingress
  - `kustomization.yaml` for `kubectl apply -k deploy/k8s`
- `helm/techdebt/` – Helm chart (configurable values, templates for all components)
- `argocd/` – Declarative Argo CD Applications
  - `application-k8s.yaml` – deploys from `deploy/k8s` (Kustomize)
  - `application-helm.yaml` – deploys from `deploy/helm/techdebt` (Helm)
- `ARGOCD-LOCAL.md` – step-by-step local cluster + Argo CD guide

## Prerequisites

- Kubernetes cluster (local: kind/minikube/k3d/Docker Desktop, or remote)
- `kubectl` configured to the target cluster
- Container images available to the cluster:
  - `techdebt-backend:local` (or your registry image)
  - `techdebt-frontend:local` (or your registry image)
- Argo CD installed in the cluster for GitOps deployment
- Git repository containing this project (Argo CD syncs from Git)

## Build & provide images

```bash
# from repo root
docker build -t techdebt-backend:local ./backend
docker build -t techdebt-frontend:local ./frontend

# kind example
kind load docker-image techdebt-backend:local techdebt-frontend:local --name <cluster>

# minikube example
minikube image load techdebt-backend:local
minikube image load techdebt-frontend:local
```

For shared/remote clusters, push to a registry and set image repository/tag (and pull policy/secrets as needed) in `deploy/k8s/*.yaml` or Helm `values.yaml`.

## Option 1: Deploy with Kustomize (kubectl)

```bash
kubectl apply -k deploy/k8s
kubectl get pods,svc,ingress -n techdebt
```

## Option 2: Deploy with Helm

```bash
helm upgrade --install techdebt deploy/helm/techdebt \
  --namespace techdebt --create-namespace

# override values (images, service types, ingress, persistence, etc.)
# helm upgrade --install techdebt deploy/helm/techdebt -n techdebt -f my-values.yaml
```

## Option 3: GitOps deployment with Argo CD

1. **Push this repo to Git** (Argo CD requires a Git source):
   ```bash
   git init && git add . && git commit -m "Deploy manifests"
   git remote add origin https://github.com/<org>/<repo>.git
   git push -u origin main
   ```

2. **Install Argo CD** (if needed): see `ARGOCD-LOCAL.md`.

3. **Choose one Argo CD Application** and update `spec.source.repoURL` and `spec.source.targetRevision`:
   - **Kustomize:** `deploy/argocd/application-k8s.yaml` (path `deploy/k8s`)
   - **Helm:** `deploy/argocd/application-helm.yaml` (path `deploy/helm/techdebt`)

4. **Apply the Application manifest**:
   ```bash
   kubectl apply -f deploy/argocd/application-k8s.yaml
   # or
   kubectl apply -f deploy/argocd/application-helm.yaml
   ```

5. Argo CD will sync automatically (automated prune + self-heal enabled) into namespace `techdebt`.
   - UI: port-forward `svc/argocd-server -n argocd 8080:443` → https://localhost:8080
   - CLI: `argocd app get techdebt-platform` / `argocd app sync techdebt-platform`

## Access

- **Ingress (recommended, after installing an Ingress Controller):** enabled by default for host `techdebt.local`. Install/configure an ingress controller (e.g. NGINX Ingress), map DNS/`/etc/hosts` to the controller address, and access `http://techdebt.local` (routes `/` to frontend and `/api`, `/health`, `/docs`, `/openapi.json` to backend). Adjust in `deploy/k8s/ingress.yaml` or Helm values.
  - With a working ingress controller, app services (frontend/backend) can remain **ClusterIP** (no NodePort required on app services). The controller/service must still be externally reachable.
- **Port-forward (dev/local fallback):**
  ```bash
  kubectl port-forward svc/frontend -n techdebt 5173:5173
  kubectl port-forward svc/backend -n techdebt 8000:8000
  # or with Helm release/service names:
  # kubectl port-forward svc/<release>-techdebt-platform-frontend -n techdebt 5173:5173
  ```
- **NodePort (optional):** if you need direct NodePort access (no ingress controller), set frontend/backend service type to `NodePort` and specify node ports in Helm values or raw manifests. Not required when using Ingress.

## Configuration notes

- Default manifests/charts are tuned for **local/dev**: Ingress-first with **ClusterIP** app services (frontend/backend), Vite dev frontend, `uvicorn` backend, PVC-backed Postgres defaults, and sample secrets. Install an Ingress Controller for external access, or use `kubectl port-forward`/optional NodePort overrides.
- **Secrets:** change `SECRET_KEY` and database credentials before any shared use; use external secret management for production.
- **Persistence:** Postgres uses a PVC (`5Gi`) in provided manifests/chart; ensure a suitable StorageClass in your cluster.
- **AWS access:** login via portal (Access Key/Secret Key). Cluster egress must allow AWS APIs and lifecycle data sources.
- **GitOps:** commit environment-specific overrides (e.g. Helm values files, Kustomize overlays, image tags) to Git so Argo CD reconciles desired state.

For local cluster setup details, see `ARGOCD-LOCAL.md`.
