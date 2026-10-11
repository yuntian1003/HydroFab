import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Tool } from '../../models/models';

@Component({
  selector: 'app-rules-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rules-view animate-in">
      <div class="view-header">
        <div>
          <h1 class="view-title">Detection Rules & Thresholds</h1>
          <p class="view-subtitle">Mathematical logic and per-machine thresholds used by the anomaly detector to flag warning and critical states.</p>
        </div>
      </div>

      <!-- ── Rule Cards ── -->
      <div class="rule-cards-grid">

        <!-- 1. Water Spike Rule -->
        <div class="rule-card glass-card">
          <div class="rule-icon-header">
            <span class="rule-icon rule-icon--water">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
              </svg>
            </span>
            <div>
              <h3 class="rule-name">Water Flow Rate Thresholds</h3>
              <span class="rule-badge">Flow Telemetry</span>
            </div>
          </div>
          <p class="rule-desc">
            Ultra-pure water flow rate is sampled every 5 seconds. Baseline nominal flow centers around <strong>70%</strong> of configured capacity.
          </p>
          <div class="threshold-levels">
            <div class="threshold-level threshold-level--normal">
              <span class="badge badge--normal">Normal</span>
              <span class="thresh-math">≤ 100% Limit</span>
              <span class="thresh-desc">Standard fab operating range</span>
            </div>
            <div class="threshold-level threshold-level--warning">
              <span class="badge badge--warning">Warning</span>
              <span class="thresh-math">&gt; 100% &amp; ≤ 130% Limit</span>
              <span class="thresh-desc">Minor leak or valve pressure surge</span>
            </div>
            <div class="threshold-level threshold-level--critical">
              <span class="badge badge--critical">Critical</span>
              <span class="thresh-math">&gt; 130% Limit</span>
              <span class="thresh-desc">Major pipe burst or seal failure</span>
            </div>
          </div>
        </div>

        <!-- 2. Energy Spike Rule -->
        <div class="rule-card glass-card">
          <div class="rule-icon-header">
            <span class="rule-icon rule-icon--energy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </span>
            <div>
              <h3 class="rule-name">Energy Consumption Thresholds</h3>
              <span class="rule-badge">Power Draw Telemetry</span>
            </div>
          </div>
          <p class="rule-desc">
            Electricity consumption in kilowatt-hours (kWh) per chamber/tool. Baseline draw is ~<strong>70%</strong> capacity.
          </p>
          <div class="threshold-levels">
            <div class="threshold-level threshold-level--normal">
              <span class="badge badge--normal">Normal</span>
              <span class="thresh-math">≤ 100% Limit</span>
              <span class="thresh-desc">Standard chamber thermal cycle</span>
            </div>
            <div class="threshold-level threshold-level--warning">
              <span class="badge badge--warning">Warning</span>
              <span class="thresh-math">&gt; 100% &amp; ≤ 130% Limit</span>
              <span class="thresh-desc">RF generator thermal deviation</span>
            </div>
            <div class="threshold-level threshold-level--critical">
              <span class="badge badge--critical">Critical</span>
              <span class="thresh-math">&gt; 130% Limit</span>
              <span class="thresh-desc">Heating coil short / power runaway</span>
            </div>
          </div>
        </div>

        <!-- 3. Recycling Drop Rule -->
        <div class="rule-card glass-card">
          <div class="rule-icon-header">
            <span class="rule-icon rule-icon--recycling">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </span>
            <div>
              <h3 class="rule-name">Water Recycling Rate Thresholds</h3>
              <span class="rule-badge">Efficiency Target</span>
            </div>
          </div>
          <p class="rule-desc">
            Industrial factory sustainability metric requiring reclamation and reuse of processed rinse water.
          </p>
          <div class="threshold-levels">
            <div class="threshold-level threshold-level--normal">
              <span class="badge badge--normal">Normal</span>
              <span class="thresh-math">≥ Target Min %</span>
              <span class="thresh-desc">Meets or exceeds recycling targets</span>
            </div>
            <div class="threshold-level threshold-level--warning">
              <span class="badge badge--warning">Warning</span>
              <span class="thresh-math">&lt; Target Min %</span>
              <span class="thresh-desc">Membrane fouling or sensor calibration</span>
            </div>
            <div class="threshold-level threshold-level--critical">
              <span class="badge badge--critical">Critical</span>
              <span class="thresh-math">&lt; (Target Min % − 15%)</span>
              <span class="thresh-desc">Reclamation pump failure / dump valve open</span>
            </div>
          </div>
        </div>

      </div>

      <!-- ── Per-Tool Limit Reference Table ── -->
      <div class="table-section glass-card">
        <div class="table-header">
          <div>
            <h2 class="section-title">
              <svg class="section-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;display:inline-block;vertical-align:middle;margin-right:6px;color:var(--accent-cyan);">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              Configured Machine Limits &amp; Calculated Flag Cut-offs
            </h2>
            <p class="section-subtitle">Live matrix of all 20 tools with calculated exact numerical cut-offs where Warning and Critical flags trigger.</p>
          </div>
          <div class="zone-filters">
            <button
              class="zone-btn"
              [class.zone-btn--active]="selectedZone === 'ALL'"
              (click)="selectedZone = 'ALL'">
              All (20)
            </button>
            <button
              *ngFor="let zone of zones"
              class="zone-btn"
              [class.zone-btn--active]="selectedZone === zone"
              (click)="selectedZone = zone">
              {{ zone }}
            </button>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="threshold-table">
            <thead>
              <tr>
                <th>Tool Name</th>
                <th>Zone / Bay</th>
                <th>Water Normal Limit</th>
                <th>Water Critical (&gt;1.3×)</th>
                <th>Energy Normal Limit</th>
                <th>Energy Critical (&gt;1.3×)</th>
                <th>Recycling Target</th>
                <th>Recycling Critical (&lt;−15%)</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of filteredTools">
                <td>
                  <span class="tool-cell-name">
                    <span class="tool-dot"></span>
                    {{ t.name }}
                  </span>
                </td>
                <td><span class="zone-pill">{{ t.zone }}</span></td>
                <td>
                  <span class="val-num">{{ t.waterLimitLph | number:'1.0-0' }} L/h</span>
                </td>
                <td>
                  <span class="val-crit">&gt; {{ (t.waterLimitLph * 1.3) | number:'1.1-1' }} L/h</span>
                </td>
                <td>
                  <span class="val-num">{{ t.energyLimitKwh | number:'1.0-0' }} kWh</span>
                </td>
                <td>
                  <span class="val-crit">&gt; {{ (t.energyLimitKwh * 1.3) | number:'1.1-1' }} kWh</span>
                </td>
                <td>
                  <span class="val-num">≥ {{ t.minRecyclingPct | number:'1.0-0' }}%</span>
                </td>
                <td>
                  <span class="val-crit">&lt; {{ (t.minRecyclingPct - 15) | number:'1.0-0' }}%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .rules-view {
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

    /* ── Rule Cards ── */
    .rule-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
    }

    .rule-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .rule-icon-header {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .rule-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }

    .rule-icon--water { background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); }
    .rule-icon--energy { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); }
    .rule-icon--recycling { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); }

    .rule-name {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .rule-badge {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
    }

    .rule-desc {
      font-size: 0.82rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .threshold-levels {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 4px;
    }

    .threshold-level {
      background: rgba(0, 0, 0, 0.25);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      display: grid;
      grid-template-columns: 80px 140px 1fr;
      align-items: center;
      gap: 10px;
      border: 1px solid var(--border-subtle);
    }

    .thresh-math {
      font-size: 0.78rem;
      font-weight: 700;
      font-family: monospace;
      color: var(--text-primary);
    }

    .thresh-desc {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    /* ── Table Section ── */
    .table-section {
      padding: 24px;
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      flex-wrap: wrap;
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

    .section-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .zone-filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .zone-btn {
      background: var(--bg-glass);
      border: 1px solid var(--border-glass);
      color: var(--text-secondary);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .zone-btn:hover {
      background: var(--bg-glass-hover);
      color: var(--text-primary);
    }

    .zone-btn--active {
      background: var(--accent-blue);
      border-color: var(--accent-blue);
      color: white;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .threshold-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.82rem;
    }

    .threshold-table th {
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

    .threshold-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .threshold-table tr:hover td {
      background: var(--bg-glass-hover);
    }

    .tool-cell-name {
      font-weight: 600;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tool-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-cyan);
    }

    .zone-pill {
      font-size: 0.7rem;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 8px;
      border-radius: 6px;
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
    }

    .val-num {
      font-weight: 600;
      color: var(--text-primary);
    }

    .val-crit {
      font-weight: 600;
      color: var(--status-critical);
      background: var(--status-critical-bg);
      padding: 2px 6px;
      border-radius: 4px;
    }

    @media (max-width: 900px) {
      .threshold-level {
        grid-template-columns: 1fr;
        gap: 4px;
      }
    }
  `]
})
export class RulesViewComponent implements OnInit {
  tools: Tool[] = [];
  selectedZone = 'ALL';
  zones: string[] = ['Etch Bay', 'Deposition Bay', 'Assembly Bay', 'Test Bay'];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getTools().subscribe(tools => {
      this.tools = tools;
      const uniqueZones = [...new Set(tools.map(t => t.zone))];
      if (uniqueZones.length > 0) {
        this.zones = uniqueZones;
      }
    });
  }

  get filteredTools(): Tool[] {
    if (this.selectedZone === 'ALL') return this.tools;
    return this.tools.filter(t => t.zone === this.selectedZone);
  }
}
