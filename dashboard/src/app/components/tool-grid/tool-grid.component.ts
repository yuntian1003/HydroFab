import { Component, OnDestroy, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ToolStatus } from '../../models/models';

@Component({
  selector: 'app-tool-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="tool-grid-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">⚙️</span>
          Equipment Status
        </h2>
        <div class="summary-badges">
          <span class="badge badge--normal">{{ normalCount }} Normal</span>
          <span class="badge badge--warning">{{ warningCount }} Warning</span>
          <span class="badge badge--critical">{{ criticalCount }} Critical</span>
        </div>
      </div>

      <div class="tool-grid">
        <div
          *ngFor="let tool of tools; let i = index; trackBy: trackByToolId"
          class="tool-card glass-card animate-in"
          [class.tool-card--normal]="tool.status === 'normal'"
          [class.tool-card--warning]="tool.status === 'warning'"
          [class.tool-card--critical]="tool.status === 'critical'"
          [class.tool-card--selected]="selectedToolId === tool.toolId"
          [style.animation-delay]="(i * 40) + 'ms'"
          (click)="selectTool(tool)"
          [id]="'tool-card-' + tool.toolId"
        >
          <div class="card-status-bar" [attr.data-status]="tool.status"></div>

          <div class="card-header">
            <span class="tool-name">{{ tool.toolName }}</span>
            <span class="badge" [ngClass]="{
              'badge--normal': tool.status === 'normal',
              'badge--warning': tool.status === 'warning',
              'badge--critical': tool.status === 'critical'
            }">
              <span class="status-dot"></span>
              {{ tool.status }}
            </span>
          </div>

          <span class="tool-zone">{{ tool.zone }}</span>

          <div class="card-metrics" *ngIf="tool.waterLph !== null">
            <div class="metric">
              <span class="metric-label">💧 Water</span>
              <span class="metric-value" [class.metric-exceeded]="tool.waterLph! > tool.waterLimitLph">
                {{ tool.waterLph | number:'1.1-1' }}
                <span class="metric-unit">L/h</span>
              </span>
              <div class="metric-bar">
                <div class="metric-bar-fill metric-bar--water"
                     [style.width.%]="getPercent(tool.waterLph!, tool.waterLimitLph)"></div>
              </div>
            </div>
            <div class="metric">
              <span class="metric-label">⚡ Energy</span>
              <span class="metric-value" [class.metric-exceeded]="tool.energyKwh! > tool.energyLimitKwh">
                {{ tool.energyKwh | number:'1.1-1' }}
                <span class="metric-unit">kWh</span>
              </span>
              <div class="metric-bar">
                <div class="metric-bar-fill metric-bar--energy"
                     [style.width.%]="getPercent(tool.energyKwh!, tool.energyLimitKwh)"></div>
              </div>
            </div>
            <div class="metric">
              <span class="metric-label">♻️ Recycle</span>
              <span class="metric-value" [class.metric-exceeded]="tool.recyclingPct! < tool.minRecyclingPct">
                {{ tool.recyclingPct | number:'1.1-1' }}
                <span class="metric-unit">%</span>
              </span>
              <div class="metric-bar">
                <div class="metric-bar-fill metric-bar--recycling"
                     [style.width.%]="tool.recyclingPct"></div>
              </div>
            </div>
          </div>

          <div class="card-no-data" *ngIf="tool.waterLph === null">
            <span>Awaiting data…</span>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .tool-grid-section { position: relative; }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
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

    .summary-badges {
      display: flex;
      gap: 8px;
    }

    .tool-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .tool-card {
      position: relative;
      padding: 16px;
      cursor: pointer;
      overflow: hidden;
      transition: all var(--transition-base);
    }

    .tool-card--selected {
      border-color: var(--accent-blue) !important;
      box-shadow: 0 0 0 1px var(--accent-blue), var(--shadow-card), var(--shadow-glow) !important;
    }

    /* Status bar at top of card */
    .card-status-bar {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      transition: background var(--transition-base);
    }
    .tool-card--normal .card-status-bar  { background: var(--status-normal); }
    .tool-card--warning .card-status-bar { background: var(--status-warning); }
    .tool-card--critical .card-status-bar {
      background: var(--status-critical);
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }

    .tool-name {
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--text-primary);
    }

    .tool-zone {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 12px;
      display: block;
    }

    .status-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      display: inline-block;
    }
    .badge--normal .status-dot  { background: var(--status-normal); }
    .badge--warning .status-dot { background: var(--status-warning); }
    .badge--critical .status-dot { background: var(--status-critical); }

    .card-metrics {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .metric {
      display: grid;
      grid-template-columns: 90px 1fr;
      grid-template-rows: auto auto;
      gap: 2px 8px;
      align-items: center;
    }

    .metric-label {
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .metric-value {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
      text-align: right;
      transition: color var(--transition-fast);
    }

    .metric-exceeded { color: var(--status-critical) !important; }

    .metric-unit {
      font-size: 0.7rem;
      font-weight: 400;
      color: var(--text-muted);
    }

    .metric-bar {
      grid-column: 1 / -1;
      height: 3px;
      background: rgba(255,255,255,0.06);
      border-radius: 2px;
      overflow: hidden;
    }

    .metric-bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width var(--transition-slow);
      max-width: 100%;
    }
    .metric-bar--water     { background: var(--chart-water); }
    .metric-bar--energy    { background: var(--chart-energy); }
    .metric-bar--recycling { background: var(--chart-recycling); }

    .card-no-data {
      text-align: center;
      padding: 20px 0;
      color: var(--text-muted);
      font-size: 0.85rem;
    }
  `]
})
export class ToolGridComponent implements OnDestroy {
  @Output() toolSelected = new EventEmitter<number>();

  tools: ToolStatus[] = [];
  selectedToolId: number | null = null;

  normalCount = 0;
  warningCount = 0;
  criticalCount = 0;

  private sub: Subscription;

  constructor(private api: ApiService) {
    this.sub = this.api.toolStatus$.subscribe(tools => {
      this.tools = tools;
      this.normalCount   = tools.filter(t => t.status === 'normal').length;
      this.warningCount  = tools.filter(t => t.status === 'warning').length;
      this.criticalCount = tools.filter(t => t.status === 'critical').length;
    });
  }

  selectTool(tool: ToolStatus) {
    this.selectedToolId = tool.toolId;
    this.toolSelected.emit(tool.toolId);
  }

  getPercent(value: number, limit: number): number {
    return Math.min((value / limit) * 100, 100);
  }

  trackByToolId(_: number, tool: ToolStatus): number {
    return tool.toolId;
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
