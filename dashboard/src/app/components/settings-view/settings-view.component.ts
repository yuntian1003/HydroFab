import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="settings-view animate-in">
      <div class="view-header">
        <div>
          <h1 class="view-title">System Settings &amp; Architecture</h1>
          <p class="view-subtitle">Simulation parameters, polling frequencies, and container orchestration status.</p>
        </div>
      </div>

      <div class="settings-grid">
        <!-- 1. Simulator Configuration -->
        <div class="config-card glass-card">
          <div class="config-card-header">
            <span class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;color:var(--accent-cyan);">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </span>
            <div>
              <h3 class="config-title">Python Simulator Parameters</h3>
              <span class="config-subtitle">Synthetic fab telemetry generator</span>
            </div>
          </div>
          <div class="param-list">
            <div class="param-row">
              <span class="param-name">Telemetry Interval</span>
              <span class="param-value">5 Seconds</span>
            </div>
            <div class="param-row">
              <span class="param-name">Anomaly Injection Chance</span>
              <span class="param-value param-value--highlight">5.0% (~1 breach / 20 readings)</span>
            </div>
            <div class="param-row">
              <span class="param-name">Baseline Load Mean</span>
              <span class="param-value">70% of Max Limit</span>
            </div>
            <div class="param-row">
              <span class="param-name">Baseline Noise (Jitter)</span>
              <span class="param-value">±8% Normal Distribution</span>
            </div>
            <div class="param-row">
              <span class="param-name">Monitored Tool Count</span>
              <span class="param-value">20 Semiconductor Machines</span>
            </div>
          </div>
        </div>

        <!-- 2. Services & Architecture -->
        <div class="config-card glass-card">
          <div class="config-card-header">
            <span class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;color:var(--accent-blue);">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
              </svg>
            </span>
            <div>
              <h3 class="config-title">Architecture &amp; Microservices</h3>
              <span class="config-subtitle">Containerized pipeline</span>
            </div>
          </div>
          <div class="service-list">
            <div class="service-item">
              <span class="service-dot service-dot--live"></span>
              <div class="service-details">
                <span class="service-name">fab-dashboard (Angular 18)</span>
                <span class="service-sub">Port 4200 · Nginx Alpine · RxJS 5s Polling</span>
              </div>
            </div>
            <div class="service-item">
              <span class="service-dot service-dot--live"></span>
              <div class="service-details">
                <span class="service-name">fab-api (ASP.NET Core 8)</span>
                <span class="service-sub">Port 5000 · EF Core · REST Endpoints + Swagger</span>
              </div>
            </div>
            <div class="service-item">
              <span class="service-dot service-dot--live"></span>
              <div class="service-details">
                <span class="service-name">fab-postgres (PostgreSQL 16)</span>
                <span class="service-sub">Port 5432 · HydroFab Schema · Time-Series Storage</span>
              </div>
            </div>
            <div class="service-item">
              <span class="service-dot service-dot--live"></span>
              <div class="service-details">
                <span class="service-name">fab-simulator (Python 3.12)</span>
                <span class="service-sub">NumPy · Psycopg2 · Anomaly Injection Engine</span>
              </div>
            </div>
            <div class="service-item">
              <span class="service-dot service-dot--live"></span>
              <div class="service-details">
                <span class="service-name">fab-adminer (Database Web Console)</span>
                <span class="service-sub">Port 8080 · Visual PostgreSQL Table Browser &amp; SQL Query Editor</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Smart Factory Sustainability Standards -->
        <div class="config-card glass-card span-full">
          <div class="config-card-header">
            <span class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;color:var(--status-normal);">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
            </span>
            <div>
              <h3 class="config-title">Factory Sustainability &amp; Resource Efficiency Standards</h3>
              <span class="config-subtitle">Universal industrial monitoring &amp; environmental compliance</span>
            </div>
          </div>
          <p class="facility-desc">
            Modern advanced manufacturing and cleanroom facilities operate with stringent utility efficiency targets, requiring water reclamation rates of 80% or higher and active electricity monitoring to prevent runaway consumption and equipment wear.
            HydroFab provides universal utility monitoring by bridging real-time mathematical telemetry, PostgreSQL time-series indexing, ASP.NET Core REST APIs, and responsive Angular visualization with containerized microservice orchestration.
          </p>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .settings-view {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .view-header {
      margin-bottom: 4px;
    }

    .view-title {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: var(--gradient-brand);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .view-subtitle {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 20px;
    }

    .span-full {
      grid-column: 1 / -1;
    }

    .config-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .config-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 14px;
    }

    .card-icon {
      font-size: 1.5rem;
    }

    .config-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .config-subtitle {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .param-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .param-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.82rem;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }

    .param-name {
      color: var(--text-secondary);
    }

    .param-value {
      font-weight: 600;
      color: var(--text-primary);
      font-family: monospace;
    }

    .param-value--highlight {
      color: var(--status-warning);
    }

    .service-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .service-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }

    .service-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .service-dot--live {
      background: var(--status-normal);
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    }

    .service-details {
      display: flex;
      flex-direction: column;
    }

    .service-name {
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--text-primary);
    }

    .service-sub {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .facility-desc {
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.6;
    }
  `]
})
export class SettingsViewComponent {}
