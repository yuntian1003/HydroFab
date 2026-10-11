import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AnomalyAlert } from '../../models/models';

interface AnomalyInsight {
  title: string;
  cause: string;
  action: string;
  impact: string;
}

@Component({
  selector: 'app-alert-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alert-panel glass-card animate-in">
      <!-- ── Segmented Control / Tab Switcher ── -->
      <div class="panel-tab-bar">
        <button
          class="panel-tab-btn"
          [class.panel-tab-btn--active]="activeTab === 'active'"
          (click)="setActiveTab('active')"
        >
          <span class="tab-indicator-dot" *ngIf="alerts.length > 0"></span>
          <span class="panel-tab-label">Active Alerts</span>
          <span
            class="tab-count-chip"
            [class.tab-count-chip--critical]="hasCriticalAlerts"
            [class.tab-count-chip--warning]="!hasCriticalAlerts && alerts.length > 0"
          >
            {{ alerts.length }}
          </span>
        </button>

        <button
          class="panel-tab-btn"
          [class.panel-tab-btn--active]="activeTab === 'history'"
          (click)="setActiveTab('history')"
        >
          <svg class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="panel-tab-label">Alert History</span>
          <span class="tab-count-chip tab-count-chip--resolved">
            {{ resolvedAlerts.length }}
          </span>
        </button>
      </div>

      <!-- ════════ ACTIVE ALERTS VIEW ════════ -->
      <div *ngIf="activeTab === 'active'">
        <div class="panel-header">
          <div class="header-title-group">
            <h2 class="section-title">
              <svg class="section-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Active Incident Alerts
            </h2>
            <span class="showing-badge" *ngIf="alerts.length > 0">
              {{ isExpanded ? ('All ' + alerts.length + ' (Scroll to view)') : (Math.min(3, alerts.length) + ' of ' + alerts.length) }}
            </span>
          </div>

          <button
            *ngIf="alerts.length > 3"
            class="toggle-expand-btn"
            (click)="isExpanded = !isExpanded"
          >
            {{ isExpanded ? 'Show Top 3 Only ▲' : 'Show All (' + alerts.length + ') ▼' }}
          </button>
        </div>

        <!-- Empty State -->
        <div class="no-alerts" *ngIf="alerts.length === 0">
          <svg class="no-alerts-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <p class="no-alerts-title">All Systems Nominal</p>
          <p class="no-alerts-sub">No unresolved telemetry excursions detected.</p>
        </div>

        <!-- Alerts List (Shows 3 nicely; when Show All clicked, keeps height at 3 cards and scrolls) -->
        <div
          class="alerts-list"
          [class.alerts-list--scrollable]="isExpanded"
          *ngIf="alerts.length > 0"
        >
          <div
            *ngFor="let alert of displayedAlerts; trackBy: trackByAlertId"
            class="alert-card"
            [class.alert-card--selected]="selectedAlert?.id === alert.id"
            [class.alert-card--warning]="alert.severity === 'warning'"
            [class.alert-card--critical]="alert.severity === 'critical'"
            (click)="selectAlert(alert)"
          >
            <div class="alert-severity-bar" [attr.data-severity]="alert.severity"></div>

            <div class="alert-body">
              <div class="alert-top-row">
                <div class="badge-group">
                  <span class="badge" [ngClass]="{
                    'badge--warning': alert.severity === 'warning',
                    'badge--critical': alert.severity === 'critical'
                  }">{{ alert.severity | uppercase }}</span>
                  <span class="alert-type-name">{{ formatType(alert.type) }}</span>
                </div>
                <span class="click-hint">Click for Insight</span>
              </div>

              <div class="alert-main-row">
                <span class="alert-tool-name">{{ alert.toolName }}</span>
                <span class="alert-time">{{ formatTime(alert.detectedAt) }}</span>
              </div>

              <!-- Diagnostic Insight Panel (When selected) -->
              <div class="insight-container animate-in" *ngIf="selectedAlert?.id === alert.id" (click)="$event.stopPropagation()">
                <div class="insight-header">
                  <span class="insight-badge">DIAGNOSTIC INSIGHT</span>
                  <button class="insight-close" (click)="selectedAlert = null">✕</button>
                </div>

                <div class="insight-content">
                  <div class="insight-row">
                    <span class="insight-label">Probable Cause:</span>
                    <p class="insight-val">{{ getInsight(alert.type).cause }}</p>
                  </div>
                  <div class="insight-row">
                    <span class="insight-label">Operational Impact:</span>
                    <p class="insight-val">{{ getInsight(alert.type).impact }}</p>
                  </div>
                  <div class="insight-row">
                    <span class="insight-label">Recommended Action:</span>
                    <p class="insight-val insight-val--action">{{ getInsight(alert.type).action }}</p>
                  </div>
                </div>

                <div class="insight-actions">
                  <button
                    class="resolve-btn"
                    (click)="resolve(alert)"
                    [disabled]="resolvingId === alert.id"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    {{ resolvingId === alert.id ? 'Resolving…' : 'Mark Resolved' }}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- ════════ ALERT HISTORY (RESOLVED) VIEW ════════ -->
      <div *ngIf="activeTab === 'history'">
        <div class="panel-header">
          <div class="header-title-group">
            <h2 class="section-title section-title--resolved">
              <svg class="section-svg section-svg--resolved" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Resolved Incident History
            </h2>
            <span class="showing-badge" *ngIf="resolvedAlerts.length > 0">
              {{ resolvedAlerts.length }} resolved
            </span>
          </div>

          <span class="history-scroll-hint" *ngIf="resolvedAlerts.length > 3">
            Scroll to view all
          </span>
        </div>

        <!-- Empty History State -->
        <div class="no-alerts" *ngIf="resolvedAlerts.length === 0">
          <svg class="no-alerts-svg no-alerts-svg--history" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="no-alerts-title">No Resolved Incidents Yet</p>
          <p class="no-alerts-sub">When active alerts are marked resolved, their resolution audit records appear here.</p>
        </div>

        <!-- Resolved Alerts List (Maintains 3-card height, scrollable) -->
        <div
          class="alerts-list alerts-list--scrollable"
          *ngIf="resolvedAlerts.length > 0"
        >
          <div
            *ngFor="let alert of resolvedAlerts; trackBy: trackByAlertId"
            class="alert-card alert-card--resolved"
            [class.alert-card--selected]="selectedAlert?.id === alert.id"
            (click)="selectAlert(alert)"
          >
            <div class="alert-severity-bar alert-severity-bar--resolved"></div>

            <div class="alert-body">
              <div class="alert-top-row">
                <div class="badge-group">
                  <span class="badge" [ngClass]="{
                    'badge--warning': alert.severity === 'warning',
                    'badge--critical': alert.severity === 'critical'
                  }">{{ alert.severity | uppercase }}</span>
                  <span class="alert-type-name">{{ formatType(alert.type) }}</span>
                  <span class="badge-resolved-tag">✓ RESOLVED</span>
                </div>
                <span class="click-hint">Audit Record</span>
              </div>

              <div class="alert-main-row">
                <span class="alert-tool-name">{{ alert.toolName }}</span>
                <span class="alert-time">{{ formatTime(alert.detectedAt) }}</span>
              </div>

              <!-- Diagnostic Resolution History Drawer -->
              <div class="insight-container insight-container--resolved animate-in" *ngIf="selectedAlert?.id === alert.id" (click)="$event.stopPropagation()">
                <div class="insight-header">
                  <span class="insight-badge insight-badge--resolved">INCIDENT RESOLUTION AUDIT</span>
                  <button class="insight-close" (click)="selectedAlert = null">✕</button>
                </div>

                <div class="insight-content">
                  <div class="insight-row">
                    <span class="insight-label">Root Cause:</span>
                    <p class="insight-val">{{ getInsight(alert.type).cause }}</p>
                  </div>
                  <div class="insight-row">
                    <span class="insight-label">Operational Impact:</span>
                    <p class="insight-val">{{ getInsight(alert.type).impact }}</p>
                  </div>
                  <div class="insight-row">
                    <span class="insight-label">Action Taken:</span>
                    <p class="insight-val insight-val--resolved-action">{{ getInsight(alert.type).action }}</p>
                  </div>
                  <div class="insight-row">
                    <span class="insight-label">Status:</span>
                    <p class="insight-val insight-val--resolved-status">✓ Cleared &amp; Marked Resolved by Operator</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alert-panel {
      padding: 18px 20px 20px;
      display: flex;
      flex-direction: column;
    }

    /* ── Tab Switcher / Segmented Control ── */
    .panel-tab-bar {
      display: flex;
      background: rgba(10, 15, 29, 0.6);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 3px;
      margin-bottom: 16px;
      gap: 4px;
    }

    .panel-tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 7px 12px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      font-family: var(--font-family);
      transition: all var(--transition-fast);
      position: relative;
    }

    .panel-tab-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.04);
    }

    .panel-tab-btn--active {
      background: rgba(6, 182, 212, 0.14) !important;
      color: var(--accent-cyan) !important;
      border: 1px solid rgba(6, 182, 212, 0.28);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    .tab-indicator-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--status-critical);
      box-shadow: 0 0 6px var(--status-critical);
      animation: pulse 1.8s infinite;
    }

    .tab-svg {
      width: 14px;
      height: 14px;
    }

    .tab-count-chip {
      font-size: 0.68rem;
      padding: 1px 6px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
      font-weight: 700;
    }

    .tab-count-chip--critical {
      background: rgba(239, 68, 68, 0.25);
      color: var(--status-critical);
      border: 1px solid rgba(239, 68, 68, 0.4);
    }

    .tab-count-chip--warning {
      background: rgba(245, 158, 11, 0.2);
      color: var(--status-warning);
    }

    .tab-count-chip--resolved {
      background: rgba(16, 185, 129, 0.15);
      color: var(--status-normal);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    /* ── Header ── */
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .header-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-title {
      font-size: 1.02rem;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }

    .section-svg {
      width: 17px;
      height: 17px;
      color: var(--status-warning);
    }

    .section-svg--resolved {
      color: var(--status-normal);
    }

    .showing-badge {
      font-size: 0.68rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid var(--border-subtle);
    }

    .history-scroll-hint {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-style: italic;
    }

    .toggle-expand-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      color: var(--accent-cyan);
      font-size: 0.72rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: var(--font-family);
    }

    .toggle-expand-btn:hover {
      background: rgba(6, 182, 212, 0.12);
      border-color: var(--accent-cyan);
    }

    /* ── Empty State ── */
    .no-alerts {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 34px 16px;
      color: var(--text-muted);
      text-align: center;
    }

    .no-alerts-svg {
      width: 32px;
      height: 32px;
      color: var(--status-normal);
      margin-bottom: 10px;
      opacity: 0.85;
    }

    .no-alerts-svg--history {
      color: var(--accent-cyan);
    }

    .no-alerts-title {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 3px 0;
    }

    .no-alerts-sub {
      font-size: 0.74rem;
      color: var(--text-muted);
      margin: 0;
      max-width: 300px;
    }

    /* ── Alerts List ── */
    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Exactly keeps the 3-card height and scrolls for the rest! */
    .alerts-list--scrollable {
      max-height: 236px;
      overflow-y: auto;
      padding-right: 4px;
      scroll-behavior: smooth;
    }

    /* Sleek Custom Scrollbar */
    .alerts-list--scrollable::-webkit-scrollbar {
      width: 5px;
    }
    .alerts-list--scrollable::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 4px;
    }
    .alerts-list--scrollable::-webkit-scrollbar-thumb {
      background: rgba(6, 182, 212, 0.4);
      border-radius: 4px;
    }
    .alerts-list--scrollable::-webkit-scrollbar-thumb:hover {
      background: var(--accent-cyan);
    }

    .alert-card {
      position: relative;
      flex-shrink: 0;
      min-height: 64px;
      background: var(--bg-glass);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 10px 14px 10px 16px;
      overflow: hidden;
      transition: all var(--transition-fast);
      cursor: pointer;
    }

    .alert-card:hover {
      background: var(--bg-glass-hover);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .alert-card--selected {
      border-color: var(--accent-cyan) !important;
      background: rgba(6, 182, 212, 0.05) !important;
      box-shadow: 0 0 16px rgba(6, 182, 212, 0.12);
    }

    .alert-card--resolved {
      border-color: rgba(16, 185, 129, 0.2);
    }

    .alert-card--resolved:hover {
      border-color: rgba(16, 185, 129, 0.4);
    }

    .alert-severity-bar {
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 4px;
    }
    .alert-card--warning .alert-severity-bar { background: var(--status-warning); }
    .alert-card--critical .alert-severity-bar {
      background: var(--status-critical);
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    }
    .alert-severity-bar--resolved {
      background: var(--status-normal) !important;
      box-shadow: none !important;
    }

    .alert-body {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .alert-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .badge-group {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .alert-type-name {
      font-size: 0.77rem;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .badge-resolved-tag {
      font-size: 0.64rem;
      font-weight: 700;
      color: var(--status-normal);
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.28);
      border-radius: 4px;
      padding: 1px 5px;
      letter-spacing: 0.03em;
    }

    .click-hint {
      font-size: 0.65rem;
      color: var(--text-muted);
      letter-spacing: 0.02em;
    }

    .alert-main-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .alert-tool-name {
      font-weight: 600;
      font-size: 0.86rem;
      color: var(--text-primary);
    }

    .alert-time {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    /* ── Insight Container ── */
    .insight-container {
      margin-top: 8px;
      padding: 10px 12px;
      background: rgba(10, 14, 26, 0.85);
      border: 1px solid rgba(6, 182, 212, 0.25);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 6px;
      cursor: default;
    }

    .insight-container--resolved {
      border-color: rgba(16, 185, 129, 0.25);
    }

    .insight-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 5px;
    }

    .insight-badge {
      font-size: 0.64rem;
      font-weight: 700;
      color: var(--accent-cyan);
      letter-spacing: 0.06em;
    }

    .insight-badge--resolved {
      color: var(--status-normal);
    }

    .insight-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0 4px;
    }

    .insight-close:hover { color: var(--text-primary); }

    .insight-content {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .insight-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .insight-label {
      font-size: 0.63rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .insight-val {
      font-size: 0.75rem;
      color: var(--text-secondary);
      line-height: 1.35;
      margin: 0;
    }

    .insight-val--action {
      color: var(--accent-cyan);
      font-weight: 500;
    }

    .insight-val--resolved-action {
      color: #34d399;
      font-weight: 500;
    }

    .insight-val--resolved-status {
      color: var(--status-normal);
      font-weight: 600;
    }

    .insight-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
      padding-top: 6px;
      border-top: 1px solid var(--border-subtle);
    }

    .resolve-btn {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--status-normal);
      padding: 5px 12px;
      border-radius: 6px;
      font-family: var(--font-family);
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all var(--transition-fast);
    }

    .resolve-btn:hover:not(:disabled) {
      background: rgba(16, 185, 129, 0.25);
      border-color: var(--status-normal);
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
    }

    .resolve-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class AlertPanelComponent implements OnDestroy {
  activeTab: 'active' | 'history' = 'active';

  alerts: AnomalyAlert[] = [];
  resolvedAlerts: AnomalyAlert[] = [];
  selectedAlert: AnomalyAlert | null = null;
  resolvingId: number | null = null;
  isExpanded = false;
  Math = Math;

  private sub = new Subscription();

  constructor(private api: ApiService) {
    this.sub.add(
      this.api.alerts$.subscribe(alerts => {
        this.alerts = alerts;
        // If selected alert was resolved / deleted, reset selection if on active tab
        if (this.selectedAlert && this.activeTab === 'active' && !alerts.some(a => a.id === this.selectedAlert!.id)) {
          this.selectedAlert = null;
        }
      })
    );

    this.sub.add(
      this.api.alertHistory$.subscribe(history => {
        if (history && history.length > 0) {
          // Merge with any locally resolved alerts that might not have refreshed yet
          const existingIds = new Set(history.map(h => h.id));
          const localOnly = this.resolvedAlerts.filter(r => !existingIds.has(r.id));
          this.resolvedAlerts = [...localOnly, ...history];
        }
      })
    );
  }

  get hasCriticalAlerts(): boolean {
    return this.alerts.some(a => a.severity === 'critical');
  }

  get displayedAlerts(): AnomalyAlert[] {
    if (this.isExpanded) {
      return this.alerts;
    }
    return this.alerts.slice(0, 3);
  }

  setActiveTab(tab: 'active' | 'history') {
    this.activeTab = tab;
    this.selectedAlert = null;
  }

  selectAlert(alert: AnomalyAlert) {
    if (this.selectedAlert?.id === alert.id) {
      this.selectedAlert = null;
    } else {
      this.selectedAlert = alert;
    }
  }

  getInsight(type: string): AnomalyInsight {
    switch (type) {
      case 'water_spike':
        return {
          title: 'High Water Consumption Anomaly',
          cause: 'Solenoid rinse valve stuck open or supply line pressure regulator drift.',
          impact: 'Ultra-pure water loss and potential overflow risk in process drain.',
          action: 'Inspect valve actuator #A2, check supply backpressure, and verify flowmeter calibration.'
        };
      case 'energy_spike':
        return {
          title: 'Excessive Power Draw Anomaly',
          cause: 'RF generator impedance mismatch, heating element resistance drop, or cooling fan stall.',
          impact: 'Thermal runaway risk and premature chamber component degradation.',
          action: 'Inspect RF power matching unit, test heater coil resistance, and check fan tachometer.'
        };
      case 'recycling_drop':
        return {
          title: 'Reclamation Efficiency Drop',
          cause: 'RO membrane fouling, reclaim diversion valve failure, or sensor drift.',
          impact: 'Factory recycling rate falls below the mandatory 80% sustainability threshold.',
          action: 'Trigger clean-in-place (CIP) backwash cycle and calibrate conductivity sensor.'
        };
      default:
        return {
          title: 'General Utility Anomaly',
          cause: 'Sensor reading exceeded configured threshold safety limits.',
          impact: 'Potential process drift or equipment inefficiency.',
          action: 'Perform routine calibration and verify physical telemetry lines.'
        };
    }
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
        const resolvedItem: AnomalyAlert = { ...alert, resolved: true };
        if (!this.resolvedAlerts.some(r => r.id === alert.id)) {
          this.resolvedAlerts = [resolvedItem, ...this.resolvedAlerts];
        }
        if (this.selectedAlert?.id === alert.id) {
          this.selectedAlert = null;
        }
        this.resolvingId = null;
      },
      error: () => {
        // Fallback for demo UX: mark as resolved locally
        this.alerts = this.alerts.filter(a => a.id !== alert.id);
        const resolvedItem: AnomalyAlert = { ...alert, resolved: true };
        if (!this.resolvedAlerts.some(r => r.id === alert.id)) {
          this.resolvedAlerts = [resolvedItem, ...this.resolvedAlerts];
        }
        if (this.selectedAlert?.id === alert.id) {
          this.selectedAlert = null;
        }
        this.resolvingId = null;
      },
    });
  }

  trackByAlertId(_: number, alert: AnomalyAlert): number {
    return alert.id;
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
