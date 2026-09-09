import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AnomalyAlert } from '../../models/models';

@Component({
  selector: 'app-alert-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alert-panel glass-card animate-in">
      <div class="panel-header">
        <h2 class="section-title">
          <span class="title-icon">🚨</span>
          Active Alerts
          <span class="alert-count" *ngIf="alerts.length > 0">{{ alerts.length }}</span>
        </h2>
      </div>

      <div class="no-alerts" *ngIf="alerts.length === 0">
        <div class="no-alerts-icon">✅</div>
        <p>All systems operating within normal parameters</p>
      </div>

      <div class="alerts-list" *ngIf="alerts.length > 0">
        <div
          *ngFor="let alert of alerts; trackBy: trackByAlertId"
          class="alert-item"
          [class.alert-item--warning]="alert.severity === 'warning'"
          [class.alert-item--critical]="alert.severity === 'critical'"
          [id]="'alert-' + alert.id"
        >
          <div class="alert-severity-bar" [attr.data-severity]="alert.severity"></div>

          <div class="alert-content">
            <div class="alert-top-row">
              <span class="badge" [ngClass]="{
                'badge--warning': alert.severity === 'warning',
                'badge--critical': alert.severity === 'critical'
              }">{{ alert.severity }}</span>
              <span class="alert-type">{{ formatType(alert.type) }}</span>
            </div>

            <div class="alert-tool-name">{{ alert.toolName }}</div>

            <div class="alert-bottom-row">
              <span class="alert-time">{{ formatTime(alert.detectedAt) }}</span>
              <button
                class="resolve-btn"
                (click)="resolve(alert)"
                [disabled]="resolvingId === alert.id"
              >
                {{ resolvingId === alert.id ? 'Resolving…' : 'Resolve' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alert-panel {
      padding: 24px;
      max-height: 600px;
      display: flex;
      flex-direction: column;
    }

    .panel-header {
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-icon { font-size: 1.1rem; }

    .alert-count {
      font-size: 0.75rem;
      font-weight: 700;
      background: var(--status-critical);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      min-width: 24px;
      text-align: center;
    }

    .no-alerts {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      color: var(--text-muted);
      text-align: center;
    }

    .no-alerts-icon {
      font-size: 2.5rem;
      margin-bottom: 8px;
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
      flex: 1;
    }

    .alert-item {
      position: relative;
      background: var(--bg-glass);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px 14px 14px 18px;
      overflow: hidden;
      transition: all var(--transition-fast);
    }

    .alert-item:hover {
      background: var(--bg-glass-hover);
    }

    .alert-severity-bar {
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 4px;
    }
    .alert-item--warning .alert-severity-bar { background: var(--status-warning); }
    .alert-item--critical .alert-severity-bar {
      background: var(--status-critical);
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
    }

    .alert-content { display: flex; flex-direction: column; gap: 6px; }

    .alert-top-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .alert-type {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .alert-tool-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-primary);
    }

    .alert-bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .alert-time {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .resolve-btn {
      background: transparent;
      border: 1px solid var(--border-glass);
      color: var(--text-secondary);
      padding: 4px 14px;
      border-radius: 6px;
      font-family: var(--font-family);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .resolve-btn:hover:not(:disabled) {
      background: rgba(16, 185, 129, 0.15);
      border-color: var(--status-normal);
      color: var(--status-normal);
    }

    .resolve-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class AlertPanelComponent implements OnDestroy {
  alerts: AnomalyAlert[] = [];
  resolvingId: number | null = null;

  private sub: Subscription;

  constructor(private api: ApiService) {
    this.sub = this.api.alerts$.subscribe(alerts => {
      this.alerts = alerts;
    });
  }

  formatType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  resolve(alert: AnomalyAlert) {
    this.resolvingId = alert.id;
    this.api.resolveAlert(alert.id).subscribe({
      next: () => {
        this.alerts = this.alerts.filter(a => a.id !== alert.id);
        this.resolvingId = null;
      },
      error: () => { this.resolvingId = null; },
    });
  }

  trackByAlertId(_: number, alert: AnomalyAlert): number {
    return alert.id;
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
