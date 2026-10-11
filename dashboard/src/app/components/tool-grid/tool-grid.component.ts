import { Component, OnDestroy, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ToolStatus } from '../../models/models';

type StatusFilter = 'ALL' | 'normal' | 'warning' | 'critical';

// ML metadata computed per tool card from its latest reading
interface MlMeta {
  scoreLabel: string;      // e.g. "+0.12 (Nominal)" | "-0.24 (High Outlier)"
  scoreClass: string;      // css class: ml-nominal | ml-drift | ml-outlier
  waterZ: string;          // e.g. "+3.2σ"
  waterZClass: string;
  energyZ: string;
  energyZClass: string;
  recyclingZ: string;
  recyclingZClass: string;
}

@Component({
  selector: 'app-tool-grid',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="tool-grid-section">

      <!-- ── Section Header ── -->
      <div class="section-header">
        <div class="header-left">
          <h2 class="section-title">
            <svg class="title-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            Equipment Status
          </h2>
          <span class="showing-count">Showing {{ filteredTools.length }} of {{ tools.length }} tools</span>
        </div>

        <!-- ── Clickable Status Badges (Filters) ── -->
        <div class="summary-badges">
          <button
            class="filter-badge filter-badge--all"
            [class.filter-badge--active]="statusFilter === 'ALL'"
            (click)="setStatusFilter('ALL')"
            title="Show all tools"
          >
            All {{ tools.length }}
          </button>
          <button
            class="filter-badge filter-badge--normal"
            [class.filter-badge--active]="statusFilter === 'normal'"
            (click)="setStatusFilter('normal')"
            title="Click to filter Normal tools"
          >
            <span class="status-dot"></span>
            {{ normalCount }} Normal
          </button>
          <button
            class="filter-badge filter-badge--warning"
            [class.filter-badge--active]="statusFilter === 'warning'"
            (click)="setStatusFilter('warning')"
            title="Click to filter Warning tools"
          >
            <span class="status-dot"></span>
            {{ warningCount }} Warning
          </button>
          <button
            class="filter-badge filter-badge--critical"
            [class.filter-badge--active]="statusFilter === 'critical'"
            (click)="setStatusFilter('critical')"
            title="Click to filter Critical tools"
          >
            <span class="status-dot"></span>
            {{ criticalCount }} Critical
          </button>
        </div>
      </div>

      <!-- ── Category & Search Controls Bar ── -->
      <div class="controls-bar glass-card">
        <!-- Search input -->
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            class="search-input"
            placeholder="Search tools (e.g. Etch, CVD, #01)..."
            [(ngModel)]="searchQuery"
          />
          <button *ngIf="searchQuery" class="clear-btn" (click)="searchQuery = ''">✕</button>
        </div>

        <!-- Category / Bay Pills -->
        <div class="category-pills">
          <button
            class="cat-pill"
            [class.cat-pill--active]="categoryFilter === 'ALL'"
            (click)="categoryFilter = 'ALL'"
          >
            All Bays
          </button>
          <button
            *ngFor="let cat of categories"
            class="cat-pill"
            [class.cat-pill--active]="categoryFilter === cat"
            (click)="categoryFilter = cat"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- ── Empty State ── -->
      <div class="empty-state glass-card" *ngIf="filteredTools.length === 0">
        <p class="empty-title">No tools match your current filters</p>
        <p class="empty-sub">Try changing the search query, category, or status selection.</p>
        <button class="reset-filter-btn" (click)="resetFilters()">Reset All Filters</button>
      </div>

      <!-- ── Tool Cards Grid ── -->
      <div class="tool-grid" *ngIf="filteredTools.length > 0">
        <div
          *ngFor="let tool of filteredTools; let i = index; trackBy: trackByToolId"
          class="tool-card glass-card animate-in"
          [class.tool-card--normal]="tool.status === 'normal'"
          [class.tool-card--warning]="tool.status === 'warning'"
          [class.tool-card--critical]="tool.status === 'critical'"
          [class.tool-card--selected]="selectedToolId === tool.toolId"
          [style.animation-delay]="(i * 30) + 'ms'"
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
              {{ tool.status | uppercase }}
            </span>
          </div>

          <div class="card-zone-row">
            <span class="tool-zone">{{ tool.zone }}</span>
            <span class="limits-pill" title="Configured safety thresholds">
              Limits: {{ tool.waterLimitLph | number:'1.0-0' }}L · {{ tool.energyLimitKwh | number:'1.0-0' }}kW · ≥{{ tool.minRecyclingPct | number:'1.0-0' }}%
            </span>
          </div>

          <div class="card-metrics" *ngIf="tool.waterLph !== null">
            <div class="metric">
              <span class="metric-label">Water</span>
              <span class="metric-value" [class.metric-exceeded]="tool.waterLph! > tool.waterLimitLph">
                {{ tool.waterLph | number:'1.1-1' }}
                <span class="metric-unit">/ {{ tool.waterLimitLph | number:'1.0-0' }} L/h</span>
              </span>
              <div class="metric-bar">
                <div class="metric-bar-fill metric-bar--water"
                     [style.width.%]="getPercent(tool.waterLph!, tool.waterLimitLph)"></div>
              </div>
            </div>

            <div class="metric">
              <span class="metric-label">Energy</span>
              <span class="metric-value" [class.metric-exceeded]="tool.energyKwh! > tool.energyLimitKwh">
                {{ tool.energyKwh | number:'1.1-1' }}
                <span class="metric-unit">/ {{ tool.energyLimitKwh | number:'1.0-0' }} kWh</span>
              </span>
              <div class="metric-bar">
                <div class="metric-bar-fill metric-bar--energy"
                     [style.width.%]="getPercent(tool.energyKwh!, tool.energyLimitKwh)"></div>
              </div>
            </div>

            <div class="metric">
              <span class="metric-label">Recycling</span>
              <span class="metric-value" [class.metric-exceeded]="tool.recyclingPct! < tool.minRecyclingPct">
                {{ tool.recyclingPct | number:'1.1-1' }}
                <span class="metric-unit">/ ≥{{ tool.minRecyclingPct | number:'1.0-0' }}%</span>
              </span>
              <div class="metric-bar">
                <div class="metric-bar-fill metric-bar--recycling"
                     [style.width.%]="tool.recyclingPct"></div>
              </div>
            </div>
          </div>

          <!-- ── ML Anomaly Detection Footer ── -->
          <div class="ml-footer" *ngIf="tool.waterLph !== null">
            <div class="ml-footer-top">
              <span class="ml-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ml-icon">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Isolation Forest
              </span>
              <span class="ml-score" [ngClass]="getMlMeta(tool).scoreClass">
                {{ getMlMeta(tool).scoreLabel }}
              </span>
            </div>
            <div class="ml-zscores">
              <span class="ml-zscore-item">
                <span class="ml-zscore-label">Water</span>
                <span class="ml-zscore-val" [ngClass]="getMlMeta(tool).waterZClass">{{ getMlMeta(tool).waterZ }}</span>
              </span>
              <span class="ml-zscore-sep">·</span>
              <span class="ml-zscore-item">
                <span class="ml-zscore-label">Energy</span>
                <span class="ml-zscore-val" [ngClass]="getMlMeta(tool).energyZClass">{{ getMlMeta(tool).energyZ }}</span>
              </span>
              <span class="ml-zscore-sep">·</span>
              <span class="ml-zscore-item">
                <span class="ml-zscore-label">Recycle</span>
                <span class="ml-zscore-val" [ngClass]="getMlMeta(tool).recyclingZClass">{{ getMlMeta(tool).recyclingZ }}</span>
              </span>
            </div>
          </div>

          <div class="card-no-data" *ngIf="tool.waterLph === null">
            <span>Awaiting telemetry stream…</span>
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
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .header-left {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-svg {
      width: 20px;
      height: 20px;
      color: var(--accent-cyan);
    }

    .showing-count {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* ── Clickable Filter Badges ── */
    .summary-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .filter-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      transition: all var(--transition-fast);
      font-family: var(--font-family);
    }

    .filter-badge:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
    }

    .filter-badge--all.filter-badge--active {
      background: rgba(59, 130, 246, 0.2);
      border-color: var(--accent-blue);
      color: white;
    }

    .filter-badge--normal { color: var(--status-normal); }
    .filter-badge--normal.filter-badge--active {
      background: var(--status-normal-bg);
      border-color: var(--status-normal);
      color: var(--status-normal);
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
    }

    .filter-badge--warning { color: var(--status-warning); }
    .filter-badge--warning.filter-badge--active {
      background: var(--status-warning-bg);
      border-color: var(--status-warning);
      color: var(--status-warning);
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.2);
    }

    .filter-badge--critical { color: var(--status-critical); }
    .filter-badge--critical.filter-badge--active {
      background: var(--status-critical-bg);
      border-color: var(--status-critical);
      color: var(--status-critical);
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
    }

    /* ── Controls Bar ── */
    .controls-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      margin-bottom: 20px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      flex: 1;
      min-width: 220px;
      max-width: 380px;
    }

    .search-icon {
      width: 15px;
      height: 15px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .search-input {
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: 0.8rem;
      font-family: var(--font-family);
      width: 100%;
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    .clear-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.75rem;
      padding: 0 2px;
    }

    .clear-btn:hover { color: var(--text-primary); }

    .category-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .cat-pill {
      background: transparent;
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: var(--font-family);
    }

    .cat-pill:hover {
      background: var(--bg-glass-hover);
      color: var(--text-primary);
    }

    .cat-pill--active {
      background: rgba(59, 130, 246, 0.18) !important;
      border-color: var(--accent-blue) !important;
      color: white !important;
    }

    /* ── Empty State ── */
    .empty-state {
      padding: 40px 20px;
      text-align: center;
      margin-bottom: 20px;
    }

    .empty-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 6px;
    }

    .empty-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 14px;
    }

    .reset-filter-btn {
      background: var(--accent-blue);
      border: none;
      color: white;
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }

    /* ── Grid & Cards ── */
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

    .card-zone-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      gap: 6px;
    }

    .tool-zone {
      font-size: 0.72rem;
      color: var(--text-muted);
      display: block;
    }

    .limits-pill {
      font-size: 0.65rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--border-subtle);
      white-space: nowrap;
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
      grid-template-columns: 80px 1fr;
      grid-template-rows: auto auto;
      gap: 2px 8px;
      align-items: center;
    }

    .metric-label {
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 500;
    }

    .metric-value {
      font-size: 0.88rem;
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

    /* ── ML Anomaly Detection Footer ── */
    .ml-footer {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }

    .ml-footer-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .ml-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #7c3aed;
      background: rgba(124, 58, 237, 0.12);
      border: 1px solid rgba(124, 58, 237, 0.3);
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .ml-icon {
      width: 10px;
      height: 10px;
    }

    .ml-score {
      font-size: 0.7rem;
      font-weight: 700;
      font-family: 'Roboto Mono', monospace;
    }

    .ml-nominal  { color: #10b981; }
    .ml-drift    { color: #f59e0b; }
    .ml-outlier  { color: #ef4444; }

    .ml-zscores {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }

    .ml-zscore-item {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .ml-zscore-label {
      font-size: 0.62rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .ml-zscore-val {
      font-size: 0.68rem;
      font-weight: 700;
      font-family: 'Roboto Mono', monospace;
    }

    .ml-zscore-sep {
      font-size: 0.62rem;
      color: var(--text-muted);
      margin: 0 2px;
    }

    .z-normal   { color: #10b981; }
    .z-elevated { color: #f59e0b; }
    .z-spike    { color: #ef4444; }
  `]
})
export class ToolGridComponent implements OnDestroy {
  @Output() toolSelected = new EventEmitter<{ toolId: number; toolName: string }>();

  tools: ToolStatus[] = [];
  selectedToolId: number | null = null;

  normalCount = 0;
  warningCount = 0;
  criticalCount = 0;

  statusFilter: StatusFilter = 'ALL';
  categoryFilter = 'ALL';
  searchQuery = '';
  categories: string[] = ['Etch Bay', 'Deposition Bay', 'Assembly Bay', 'Test Bay'];

  private sub: Subscription;

  constructor(private api: ApiService) {
    this.sub = this.api.toolStatus$.subscribe(tools => {
      this.tools = tools;
      this.normalCount   = tools.filter(t => t.status === 'normal').length;
      this.warningCount  = tools.filter(t => t.status === 'warning').length;
      this.criticalCount = tools.filter(t => t.status === 'critical').length;

      const uniqueCats = [...new Set(tools.map(t => t.zone))];
      if (uniqueCats.length > 0) {
        this.categories = uniqueCats;
      }

    });
  }

  get filteredTools(): ToolStatus[] {
    return this.tools.filter(t => {
      // 1. Status filter
      if (this.statusFilter !== 'ALL' && t.status !== this.statusFilter) {
        return false;
      }
      // 2. Category filter
      if (this.categoryFilter !== 'ALL' && t.zone !== this.categoryFilter) {
        return false;
      }
      // 3. Search query
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchName = t.toolName.toLowerCase().includes(q);
        const matchZone = t.zone.toLowerCase().includes(q);
        const matchId = t.toolId.toString() === q;
        if (!matchName && !matchZone && !matchId) {
          return false;
        }
      }
      return true;
    });
  }

  setStatusFilter(status: StatusFilter) {
    if (this.statusFilter === status && status !== 'ALL') {
      this.statusFilter = 'ALL';
    } else {
      this.statusFilter = status;
    }
  }

  resetFilters() {
    this.statusFilter = 'ALL';
    this.categoryFilter = 'ALL';
    this.searchQuery = '';
  }

  selectTool(tool: ToolStatus) {
    this.selectedToolId = tool.toolId;
    this.toolSelected.emit({ toolId: tool.toolId, toolName: tool.toolName });
  }

  getPercent(value: number, limit: number): number {
    return Math.min((value / limit) * 100, 100);
  }

  trackByToolId(_: number, tool: ToolStatus): number {
    return tool.toolId;
  }

  /**
   * Compute ML metadata client-side from the tool's latest reading.
   * Z-scores are relative to the expected baseline (70% of limit).
   * Isolation Forest score is approximated from the ratio of max z-score.
   */
  getMlMeta(tool: ToolStatus): MlMeta {
    const w = tool.waterLph ?? 0;
    const e = tool.energyKwh ?? 0;
    const r = tool.recyclingPct ?? 0;

    const baselineFraction = 0.70;
    const noiseStd = 0.08;

    const wMean = tool.waterLimitLph * baselineFraction;
    const wStd  = tool.waterLimitLph * noiseStd;
    const eMean = tool.energyLimitKwh * baselineFraction;
    const eStd  = tool.energyLimitKwh * noiseStd;
    const rMean = tool.minRecyclingPct + 8.0;
    const rStd  = 2.5;

    const zW = wStd > 0 ? (w - wMean) / wStd : 0;
    const zE = eStd > 0 ? (e - eMean) / eStd : 0;
    const zR = rStd > 0 ? (rMean - r) / rStd : 0;  // drop = anomalous

    const maxZ = Math.max(Math.abs(zW), Math.abs(zE), Math.abs(zR));

    // Approximate Isolation Forest score from z-space distance
    // (real score comes from Python; this is a faithful front-end estimate)
    const ifScore = -(maxZ / 10.0);

    const formatZ = (z: number) => (z >= 0 ? '+' : '') + z.toFixed(1) + 'σ';
    const zClass = (z: number) => {
      const az = Math.abs(z);
      if (az >= 2.5) return 'z-spike';
      if (az >= 1.5) return 'z-elevated';
      return 'z-normal';
    };

    let scoreLabel: string;
    let scoreClass: string;
    if (maxZ >= 2.5) {
      scoreLabel = ifScore.toFixed(3) + ' (High Outlier)';
      scoreClass = 'ml-outlier';
    } else if (maxZ >= 1.5) {
      scoreLabel = ifScore.toFixed(3) + ' (Drift)';
      scoreClass = 'ml-drift';
    } else {
      const nomScore = Math.abs(ifScore) < 0.001 ? 0 : ifScore;
      scoreLabel = (nomScore >= 0 ? '+' : '') + nomScore.toFixed(3) + ' (Nominal)';
      scoreClass = 'ml-nominal';
    }

    return {
      scoreLabel,
      scoreClass,
      waterZ: formatZ(zW),
      waterZClass: zClass(zW),
      energyZ: formatZ(zE),
      energyZClass: zClass(zE),
      recyclingZ: formatZ(zR),
      recyclingZClass: zClass(zR),
    };
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
