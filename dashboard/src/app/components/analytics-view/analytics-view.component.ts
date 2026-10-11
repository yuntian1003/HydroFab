import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { DailyLeaderboardEntry, AnalyticsSummary } from '../../models/models';

@Component({
  selector: 'app-analytics-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics-view animate-in">
      <div class="view-header">
        <div>
          <h1 class="view-title">Daily Incident Analytics &amp; Leaderboard</h1>
          <p class="view-subtitle">24-hour equipment anomaly tracking — identifying the tools with the highest critical breaches and warning frequencies.</p>
        </div>
        <div class="refresh-badge">
          <span class="live-dot"></span>
          Live Sync (5s)
        </div>
      </div>

      <!-- ── KPI Summary Cards ── -->
      <div class="kpi-grid">
        <div class="kpi-card glass-card">
          <div class="kpi-icon kpi-icon--total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Total Anomalies (24h)</span>
            <span class="kpi-value">{{ summary?.totalAnomalies ?? 0 }}</span>
            <span class="kpi-sub">Across {{ summary?.totalReadings ?? 0 }} sensor cycles</span>
          </div>
        </div>

        <div class="kpi-card glass-card">
          <div class="kpi-icon kpi-icon--critical">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;color:var(--status-critical);">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Critical Breaches</span>
            <span class="kpi-value kpi-value--critical">{{ summary?.criticalCount ?? 0 }}</span>
            <span class="kpi-sub">&gt;30% over safety threshold</span>
          </div>
        </div>

        <div class="kpi-card glass-card">
          <div class="kpi-icon kpi-icon--warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;color:var(--status-warning);">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Warning Anomalies</span>
            <span class="kpi-value kpi-value--warning">{{ summary?.warningCount ?? 0 }}</span>
            <span class="kpi-sub">Minor limit excursions</span>
          </div>
        </div>

        <div class="kpi-card glass-card">
          <div class="kpi-icon kpi-icon--resolved">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;color:var(--status-normal);">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Resolution Rate</span>
            <span class="kpi-value kpi-value--success">{{ summary?.resolutionRatePct ?? 100 }}%</span>
            <span class="kpi-sub">{{ summary?.resolvedCount ?? 0 }} resolved / {{ summary?.unresolvedCount ?? 0 }} open</span>
          </div>
        </div>
      </div>

      <!-- ── Anomaly Breakdown Bar ── -->
      <div class="breakdown-card glass-card" *ngIf="summary && summary.totalAnomalies > 0">
        <div class="breakdown-header">
          <h3 class="card-subtitle">Anomaly Distribution by Fault Type</h3>
          <span class="breakdown-total">{{ summary.totalAnomalies }} total incidents</span>
        </div>
        <div class="breakdown-bar">
          <div class="bar-slice bar-slice--water"
               [style.width.%]="getPercent(summary.breakdown.waterSpikes, summary.totalAnomalies)"
               [title]="'Water Spikes: ' + summary.breakdown.waterSpikes"></div>
          <div class="bar-slice bar-slice--energy"
               [style.width.%]="getPercent(summary.breakdown.energySpikes, summary.totalAnomalies)"
               [title]="'Energy Spikes: ' + summary.breakdown.energySpikes"></div>
          <div class="bar-slice bar-slice--recycling"
               [style.width.%]="getPercent(summary.breakdown.recyclingDrops, summary.totalAnomalies)"
               [title]="'Recycling Drops: ' + summary.breakdown.recyclingDrops"></div>
        </div>
        <div class="breakdown-legend">
          <div class="legend-chip">
            <span class="chip-dot chip-dot--water"></span>
            <span>Water Spikes: <strong>{{ summary.breakdown.waterSpikes }}</strong> ({{ getPercent(summary.breakdown.waterSpikes, summary.totalAnomalies) | number:'1.0-0' }}%)</span>
          </div>
          <div class="legend-chip">
            <span class="chip-dot chip-dot--energy"></span>
            <span>Energy Spikes: <strong>{{ summary.breakdown.energySpikes }}</strong> ({{ getPercent(summary.breakdown.energySpikes, summary.totalAnomalies) | number:'1.0-0' }}%)</span>
          </div>
          <div class="legend-chip">
            <span class="chip-dot chip-dot--recycling"></span>
            <span>Recycling Drops: <strong>{{ summary.breakdown.recyclingDrops }}</strong> ({{ getPercent(summary.breakdown.recyclingDrops, summary.totalAnomalies) | number:'1.0-0' }}%)</span>
          </div>
        </div>
      </div>

      <!-- ── Top 3 Troublemaker Machines (Podium) ── -->
      <div class="podium-section" *ngIf="topThree.length > 0">
        <h2 class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;display:inline-block;vertical-align:middle;margin-right:6px;color:var(--accent-cyan);">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          Highest Incident Frequency Equipment
        </h2>
        <div class="podium-grid">
          <div
            *ngFor="let item of topThree; let idx = index"
            class="podium-card glass-card"
            [class.podium-card--gold]="idx === 0"
            [class.podium-card--silver]="idx === 1"
            [class.podium-card--bronze]="idx === 2"
          >
            <div class="podium-rank-badge">
              <span *ngIf="idx === 0">Rank #1 · Highest Anomaly Count</span>
              <span *ngIf="idx === 1">Rank #2 · High Frequency</span>
              <span *ngIf="idx === 2">Rank #3 · Attention Recommended</span>
            </div>

            <div class="podium-header">
              <h3 class="podium-tool-name">{{ item.toolName }}</h3>
              <span class="zone-pill">{{ item.zone }}</span>
            </div>

            <div class="podium-counts">
              <div class="count-box count-box--critical">
                <span class="count-num">{{ item.criticalCount }}</span>
                <span class="count-txt">Critical</span>
              </div>
              <div class="count-box count-box--warning">
                <span class="count-num">{{ item.warningCount }}</span>
                <span class="count-txt">Warning</span>
              </div>
              <div class="count-box count-box--total">
                <span class="count-num">{{ item.totalAnomalies }}</span>
                <span class="count-txt">Total</span>
              </div>
            </div>

            <div class="podium-footer">
              <span class="last-seen" *ngIf="item.lastIncident">
                Last incident: {{ formatTime(item.lastIncident) }}
              </span>
              <span class="last-seen" *ngIf="!item.lastIncident">
                No incidents recorded today
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Full Daily Equipment Leaderboard Table ── -->
      <div class="table-section glass-card">
        <div class="table-header">
          <div>
            <h2 class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;display:inline-block;vertical-align:middle;margin-right:6px;color:var(--accent-cyan);">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              Complete 24-Hour Equipment Anomaly Log &amp; Ranking
            </h2>
            <p class="section-subtitle">Ranked by severity score (Critical × 2 + Warning). Tracks all 20 fab tools.</p>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Tool Name</th>
                <th>Zone</th>
                <th>Critical Breaches</th>
                <th>Warning Breaches</th>
                <th>Total Anomalies</th>
                <th>Resolved</th>
                <th>Last Incident</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of leaderboard; let i = index">
                <td>
                  <span class="rank-badge" [class.rank-badge--top]="i < 3">
                    #{{ i + 1 }}
                  </span>
                </td>
                <td>
                  <div class="tool-cell-info">
                    <span class="tool-cell-name">{{ item.toolName }}</span>
                    <span class="tool-limits-meta">
                      💧 {{ item.waterLimitLph | number:'1.0-0' }}L/h · ⚡ {{ item.energyLimitKwh | number:'1.0-0' }}kWh · ♻️ {{ item.minRecyclingPct | number:'1.0-0' }}%
                    </span>
                  </div>
                </td>
                <td><span class="zone-pill">{{ item.zone }}</span></td>
                <td>
                  <span class="crit-badge" [class.crit-badge--active]="item.criticalCount > 0">
                    {{ item.criticalCount }}
                  </span>
                </td>
                <td>
                  <span class="warn-badge" [class.warn-badge--active]="item.warningCount > 0">
                    {{ item.warningCount }}
                  </span>
                </td>
                <td>
                  <strong class="total-bold">{{ item.totalAnomalies }}</strong>
                </td>
                <td>
                  <span class="resolved-stat">
                    {{ item.resolvedCount }} / {{ item.totalAnomalies }}
                  </span>
                </td>
                <td>
                  <span class="incident-time">{{ item.lastIncident ? formatTime(item.lastIncident) : '—' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .analytics-view {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
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
      max-width: 800px;
    }

    .refresh-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--status-normal);
      background: var(--status-normal-bg);
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--status-normal);
      animation: pulse-dot 1.5s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }

    /* ── KPI Grid ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .kpi-card {
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .kpi-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .kpi-icon--total { background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); }
    .kpi-icon--critical { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); }
    .kpi-icon--warning { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); }
    .kpi-icon--resolved { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); }

    .kpi-content {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .kpi-label {
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .kpi-value {
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--text-primary);
      margin: 4px 0 2px;
      font-variant-numeric: tabular-nums;
    }

    .kpi-value--critical { color: var(--status-critical); }
    .kpi-value--warning { color: var(--status-warning); }
    .kpi-value--success { color: var(--status-normal); }

    .kpi-sub {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    /* ── Breakdown ── */
    .breakdown-card {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .breakdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-subtitle {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .breakdown-total {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .breakdown-bar {
      height: 12px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      display: flex;
      overflow: hidden;
      width: 100%;
    }

    .bar-slice {
      height: 100%;
      transition: width var(--transition-slow);
    }
    .bar-slice--water { background: var(--chart-water); }
    .bar-slice--energy { background: var(--chart-energy); }
    .bar-slice--recycling { background: var(--chart-recycling); }

    .breakdown-legend {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .legend-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      color: var(--text-secondary);
    }

    .chip-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .chip-dot--water { background: var(--chart-water); }
    .chip-dot--energy { background: var(--chart-energy); }
    .chip-dot--recycling { background: var(--chart-recycling); }

    /* ── Podium Section ── */
    .podium-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-icon { font-size: 1.1rem; }

    .podium-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .podium-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      position: relative;
      border-top-width: 3px !important;
    }

    .podium-card--gold { border-top-color: #fbbf24 !important; }
    .podium-card--silver { border-top-color: #94a3b8 !important; }
    .podium-card--bronze { border-top-color: #b45309 !important; }

    .podium-rank-badge {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
    }

    .podium-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .podium-tool-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .zone-pill {
      font-size: 0.7rem;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 8px;
      border-radius: 6px;
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
    }

    .podium-counts {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
    }

    .count-box {
      padding: 8px;
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .count-box--critical { background: var(--status-critical-bg); border: 1px solid rgba(239, 68, 68, 0.2); }
    .count-box--warning { background: var(--status-warning-bg); border: 1px solid rgba(245, 158, 11, 0.2); }
    .count-box--total { background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-subtle); }

    .count-num {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--text-primary);
    }

    .count-box--critical .count-num { color: var(--status-critical); }
    .count-box--warning .count-num { color: var(--status-warning); }

    .count-txt {
      font-size: 0.65rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .podium-footer {
      border-top: 1px solid var(--border-subtle);
      padding-top: 10px;
    }

    .last-seen {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    /* ── Table ── */
    .table-section {
      padding: 24px;
    }

    .table-header {
      margin-bottom: 20px;
    }

    .section-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .leaderboard-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.82rem;
    }

    .leaderboard-table th {
      background: rgba(10, 14, 26, 0.6);
      color: var(--text-muted);
      font-weight: 600;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-subtle);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }

    .leaderboard-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .leaderboard-table tr:hover td {
      background: var(--bg-glass-hover);
    }

    .rank-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.75rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
    }

    .rank-badge--top {
      color: #fbbf24;
      background: rgba(251, 191, 36, 0.12);
      border: 1px solid rgba(251, 191, 36, 0.25);
    }

    .tool-cell-info {
      display: flex;
      flex-direction: column;
    }

    .tool-cell-name {
      font-weight: 600;
      color: var(--text-primary);
    }

    .tool-limits-meta {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .crit-badge, .warn-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 0.78rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.03);
    }

    .crit-badge--active {
      color: var(--status-critical);
      background: var(--status-critical-bg);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .warn-badge--active {
      color: var(--status-warning);
      background: var(--status-warning-bg);
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .total-bold {
      font-size: 0.9rem;
      color: var(--text-primary);
    }

    .resolved-stat {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .incident-time {
      font-size: 0.72rem;
      color: var(--text-muted);
      white-space: nowrap;
    }
  `]
})
export class AnalyticsViewComponent implements OnDestroy {
  leaderboard: DailyLeaderboardEntry[] = [];
  summary: AnalyticsSummary | null = null;
  topThree: DailyLeaderboardEntry[] = [];

  private sub1: Subscription;
  private sub2: Subscription;

  constructor(private api: ApiService) {
    this.sub1 = this.api.leaderboard$.subscribe(data => {
      this.leaderboard = data;
      this.topThree = data.slice(0, 3);
    });

    this.sub2 = this.api.analyticsSummary$.subscribe(summary => {
      this.summary = summary;
    });
  }

  getPercent(value: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.min(Math.round((value / total) * 100), 100);
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  ngOnDestroy() {
    this.sub1?.unsubscribe();
    this.sub2?.unsubscribe();
  }
}
