# HydroFab — Fab Utility Monitor

> Real-time water & energy anomaly monitoring for smart factory and semiconductor manufacturing equipment.

[![Angular](https://img.shields.io/badge/Angular-18-red?logo=angular)](https://angular.io)
[![C#](https://img.shields.io/badge/C%23-.NET_8-purple?logo=dotnet)](https://dotnet.microsoft.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://postgresql.org)
[![Python](https://img.shields.io/badge/Python-3.12-yellow?logo=python)](https://python.org)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Minikube-326CE5?logo=kubernetes)](https://kubernetes.io)

---

## Background & Motivation

Modern industrial manufacturing and semiconductor cleanrooms operate with high resource demands,
pushing facilities toward water recycling targets of **80% or higher** alongside strict energy efficiency goals.

Factories need continuous visibility into utility usage *per machine* so that waste, leaks, or
recycling-rate failures can be caught quickly — not discovered on a monthly bill.

This project simulates that exact problem at small scale: 20 manufacturing "tools" (machines)
that continuously consume water and electricity, a monitoring system that watches their usage
against defined limits, and a dashboard an engineer uses to spot problems in near real time.

**This is a simulation/demo project.** All data is synthetically generated to resemble realistic
patterns, including ~5% deliberately injected anomalies (spikes, leaks, recycling-rate drops).

---

## Architecture

```
[Python Simulator] ──writes──▶ [PostgreSQL] ◀──reads── [C# API] ◀──HTTP── [Angular Dashboard]
       │                                                     │
  20 tools × 5 s                                    /api/tools/status
  ~5% anomalies                                     /api/tools/{id}/readings
  injected                                          /api/alerts
                                                    PATCH /api/alerts/{id}/resolve
```

Each component is independently containerised (Docker) and deployed as a separate Kubernetes
Deployment + Service, communicating over the cluster's internal network by Service name.

---

## Project Structure

```
HydroFab/
├── db/                     # PostgreSQL — schema DDL + 20 seeded tools
├── simulator/              # Python — generates readings, injects anomalies
├── api/                    # C# ASP.NET Core 8 — REST API (5 endpoints)
├── dashboard/              # Angular 18 — dark-theme monitoring dashboard
├── k8s/                    # Kubernetes manifests (Namespace, ConfigMap, Deployments, Services)
├── docker-compose.yml      # Phase A: single-command local dev
└── README.md
```

---

## Data Model

| Table | Purpose |
|-------|---------|
| `tools` | 20 machines with water/energy/recycling limits |
| `readings` | Time-series usage data (one row per tool per 5 s) |
| `anomaly_events` | Flagged readings with type, severity, resolved state |

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Docker Desktop | 4.x+ |
| (For K8s) Minikube or Docker Desktop K8s | Latest |

### Option A — Docker Compose (Recommended for Local Dev)

#### 🚀 How to Start
```bash
# 1. Clone the repository
git clone https://github.com/yuntian1003/HydroFab.git
cd HydroFab

# 2. Build and start all services in the background
docker-compose up -d --build

# 3. Open the services
# Dashboard UI:
http://localhost:4200

# API Explorer / Swagger:
http://localhost:5000/swagger

# Database Web Adminer (optional):
http://localhost:8080 (Server: postgres, User: fab, Pass: fab_secret, DB: hydrofab)
```

#### 🛑 How to Stop
```bash
# Stop containers (preserves database data)
docker-compose down

# Or stop and completely wipe database data volume
docker-compose down -v
```

---

### Option B — Kubernetes (Production Orchestration Demo)

Works with **Docker Desktop Kubernetes** or **Minikube**.

#### 🚀 How to Start
```bash
# 1. Ensure Kubernetes is enabled (Docker Desktop Settings -> Kubernetes -> Enable) or run: minikube start

# 2. Build container images
docker build -t fab-postgres:latest ./db
docker build -t fab-simulator:latest ./simulator
docker build -t fab-api:latest ./api
docker build -t fab-dashboard:latest ./dashboard

# 3. Deploy all Kubernetes manifests in order
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/config.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/simulator-deployment.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/dashboard-deployment.yaml

# 4. Check pod status (wait until all 4 pods are 1/1 Running)
kubectl get pods -n hydrofab

# 5. Access the application (Port-forward to host)
# Terminal 1 - Frontend:
kubectl port-forward svc/fab-dashboard 4200:80 -n hydrofab

# Terminal 2 - Backend API:
kubectl port-forward svc/fab-api 5000:5000 -n hydrofab

# 6. Open dashboard in browser:
http://localhost:4200
```

#### 🌟 Live Demo: Self-Healing Architecture
```bash
# Intentionally delete the simulator pod while viewing the dashboard
kubectl delete pod -l app=fab-simulator -n hydrofab

# Immediately watch Kubernetes self-heal and spin up a replacement
kubectl get pods -n hydrofab
```

#### 🛑 How to Stop & Clean Up
```bash
# 1. Stop port-forwards by pressing Ctrl + C in the terminals

# 2. Delete the entire namespace and all associated resources (pods, services, deployments, PVCs)
kubectl delete namespace hydrofab

# 3. (Optional) Turn off Kubernetes in Docker Desktop Settings to save CPU & RAM when not in use
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tools` | List all tools and their limits |
| GET | `/api/tools/status` | Latest reading per tool + health status |
| GET | `/api/tools/{id}/readings?limit=50` | Recent readings for trend chart |
| GET | `/api/alerts` | Unresolved anomaly events |
| PATCH | `/api/alerts/{id}/resolve` | Mark alert as resolved |

Interactive docs available at `http://localhost:5000/swagger` when running.

---

## Dashboard Features

- **Tool Grid** — 20 cards, color-coded green/amber/red by alert severity, live metric bars
- **Trend Chart** — Chart.js line chart showing water, energy, and recycling over time for a selected tool
- **Alert Panel** — Live list of unresolved anomalies, newest first, with one-click resolve

All data refreshes every 5 seconds via RxJS polling.

---

## Machine Learning & Anomaly Detection

Instead of relying solely on static thresholds, HydroFab uses an **unsupervised Machine Learning anomaly detection engine**:

- **Multivariate Isolation Forest (`scikit-learn`)**: Models the joint 3D distribution of $[\text{water}, \text{power}, \text{recycling}]$ per tool. It generates a continuous decision function score to detect multi-sensor correlated anomalies and subtle equipment drift that univariate limits miss.
- **Dynamic Rolling Z-Scores (`numpy`)**: Maintains sliding windows of recent telemetry per machine to compute moving averages ($\mu$) and standard deviations ($\sigma$) for continuous baseline profiling and root-cause feature attribution.
- **Industrial Safety Guardrails (Hybrid Interlock)**: Functions as a failsafe envelope to guarantee hard physical capacity breaches (>100% and >130%) always trigger alerts.

| Anomaly Type | Detection Engine | Severity Criteria |
|--------------|------------------|-------------------|
| `water_spike` | Isolation Forest + Water $Z$-Score | **Critical:** Score < −0.15, $Z \ge 3.5\sigma$, or >130% limit; **Warning:** Score < 0.0 or $Z \ge 2.5\sigma$ |
| `energy_spike` | Isolation Forest + Energy $Z$-Score | **Critical:** Score < −0.15, $Z \ge 3.5\sigma$, or >130% limit; **Warning:** Score < 0.0 or $Z \ge 2.5\sigma$ |
| `recycling_drop` | Isolation Forest + Recycling $Z$-Score | **Critical:** Score < −0.15, $Z \ge 3.5\sigma$, or <(Min − 15%); **Warning:** Score < 0.0 or $Z \ge 2.5\sigma$ |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Angular 18 + Chart.js | Real-time monitoring dashboard, dark theme |
| API | C# ASP.NET Core 8 | REST endpoints, EF Core, Swagger OpenAPI |
| Database | PostgreSQL 16 | Time-series readings + anomaly log |
| Machine Learning | Python 3.12 + Scikit-Learn + NumPy | Unsupervised Isolation Forest & statistical telemetry |
| Containers | Docker + Docker Compose | Local multi-container orchestration |
| Orchestration | Kubernetes | Production-grade deployment + self-healing |

---

## Architectural Highlights
- **Machine Learning Telemetry** — Unsupervised Isolation Forest (Scikit-Learn) + rolling Z-score feature attribution for proactive equipment monitoring
- **Cross-stack system software** — every layer from DB schema and ML engine to ASP.NET Core API and Angular SPA
- **Industrial manufacturing domain** — real-time water & energy monitoring and cleanroom sustainability targets
- **Modern deployment practices** — containerisation and Kubernetes self-healing architecture
- **Data pipeline** — Python (ML) → PostgreSQL → C# API → Angular (observable, real-time)
