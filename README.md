# HydroFab — Fab Utility Monitor

> Real-time water & energy anomaly monitoring for semiconductor fab equipment.
> A portfolio project targeting Intel's Software Development Internship.

[![Angular](https://img.shields.io/badge/Angular-18-red?logo=angular)](https://angular.io)
[![C#](https://img.shields.io/badge/C%23-.NET_8-purple?logo=dotnet)](https://dotnet.microsoft.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://postgresql.org)
[![Python](https://img.shields.io/badge/Python-3.12-yellow?logo=python)](https://python.org)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Minikube-326CE5?logo=kubernetes)](https://kubernetes.io)

---

## Background & Motivation

Intel's Penang, Malaysia semiconductor site sits in a region that experienced water rationing
during droughts in 2023–2024, pushing local industrial facilities toward water recycling
targets of **80% or higher**. Energy costs in the region also rose after subsidy changes in 2024.

Fabs need continuous visibility into utility usage *per machine* so that waste, leaks, or
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

### Option A — Docker Compose (recommended for first run)

```bash
# Clone
git clone https://github.com/yuntian1003/HydroFab.git
cd HydroFab

# Build and start all 4 services
docker-compose up --build

# Open the dashboard
start http://localhost:4200

# Swagger / API explorer
start http://localhost:5000/swagger
```

### Option B — Kubernetes (Minikube)

```bash
# Start Minikube
minikube start

# Build images into Minikube's Docker daemon
eval $(minikube docker-env)
docker build -t fab-postgres:latest ./db
docker build -t fab-simulator:latest ./simulator
docker build -t fab-api:latest ./api
docker build -t fab-dashboard:latest ./dashboard

# Apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/config.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/simulator-deployment.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/dashboard-deployment.yaml

# Watch pods come up
kubectl get pods -n hydrofab --watch

# Open dashboard
minikube service fab-dashboard -n hydrofab

# Demo: self-healing
kubectl delete pod -l app=fab-simulator -n hydrofab
kubectl get pods -n hydrofab   # watch it restart automatically
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

## Anomaly Detection

The Python simulator injects two types of anomalies (~5% of readings):

| Type | Method | Threshold |
|------|--------|-----------|
| `water_spike` | ×1.4–2.2 multiplier | Exceeds `water_limit_lph` |
| `energy_spike` | ×1.4–2.2 multiplier | Exceeds `energy_limit_kwh` |
| `recycling_drop` | −15–40% drop | Below `min_recycling_pct` |

Severity is `warning` for minor breaches, `critical` for breaches >30% above limit or >15% below minimum recycling.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Angular 18 + Chart.js | Real-time dashboard |
| API | C# ASP.NET Core 8 | REST endpoints, EF Core, Swagger |
| Database | PostgreSQL 16 | Time-series readings + anomaly log |
| Simulator | Python 3.12 + numpy | Synthetic data generation |
| Containers | Docker + Docker Compose | Local orchestration |
| Orchestration | Kubernetes | Production-grade deployment + self-healing |

---

## Relevance to Intel Internship

This project deliberately mirrors the technical scope described in Intel's internship listing:

- **Cross-stack system software** — every layer from DB schema to browser UI
- **Manufacturing-relevant domain** — water/energy monitoring is a real concern at Intel Penang
- **Modern deployment practices** — containerisation and Kubernetes self-healing demo
- **Data pipeline** — Python → PostgreSQL → C# API → Angular (observable, real-time)
