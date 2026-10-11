import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Subscription, interval, switchMap, startWith } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { Reading } from '../../models/models';

interface MlFeatureZ {
  label: string;
  z: number;
  sigma: string;
  tag: string;
  cssClass: string;
}

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="chart-section glass-card animate-in">
      <div class="chart-header">
        <h2 class="section-title">
          <svg class="section-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          Trend Analysis
        </h2>
        <span class="chart-tool-name" *ngIf="toolId">
          {{ toolName || ('Tool #' + toolId) }}
        </span>
      </div>

      <div class="chart-placeholder" *ngIf="!toolId">
        <svg class="placeholder-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        <p>Select a tool from the grid to view its trend data</p>
      </div>

      <div class="chart-container" [class.chart-container--full]="fullPage" *ngIf="toolId">
        <canvas baseChart
          [data]="chartData"
          [options]="chartOptions"
          [type]="'line'">
        </canvas>
      </div>

      <div class="chart-legend" *ngIf="toolId">
        <span class="legend-item">
          <span class="legend-dot" style="background: var(--chart-water)"></span>
          Water (L/h)
        </span>
        <span class="legend-item">
          <span class="legend-dot" style="background: var(--chart-energy)"></span>
          Energy (kWh)
        </span>
        <span class="legend-item">
          <span class="legend-dot" style="background: var(--chart-recycling)"></span>
          Recycling (%)
        </span>
      </div>

      <!-- ── ML Anomaly Analysis Panel ── -->
      <div class="ml-panel animate-in" *ngIf="toolId && mlReady">
        <div class="ml-panel-header">
          <div class="ml-panel-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ml-panel-icon">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            ML Telemetry & Anomaly Analysis
          </div>
          <div class="ml-model-badge">Scikit-Learn · Isolation Forest v1.4</div>
        </div>

        <div class="ml-panel-body">
          <!-- Score + Status -->
          <div class="ml-score-block">
            <div class="ml-score-label">Anomaly Score</div>
            <div class="ml-score-value" [ngClass]="mlScoreClass">
              {{ mlScoreDisplay }}
            </div>
            <div class="ml-confidence" [ngClass]="mlScoreClass">{{ mlConfidenceLabel }}</div>
          </div>

          <!-- Feature Contributions -->
          <div class="ml-features-block">
            <div class="ml-features-title">Feature Contribution (Rolling Z-Score)</div>
            <div class="ml-features-list">
              <div class="ml-feature-row" *ngFor="let feat of mlFeatures">
                <span class="ml-feature-name">{{ feat.label }}</span>
                <span class="ml-feature-sigma" [ngClass]="feat.cssClass">{{ feat.sigma }}</span>
                <span class="ml-feature-tag" [ngClass]="feat.cssClass">{{ feat.tag }}</span>
                <div class="ml-feature-bar-track">
                  <div class="ml-feature-bar-fill"
                       [ngClass]="feat.cssClass"
                       [style.width.%]="getZBarWidth(feat.z)">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Safety Envelope -->
          <div class="ml-safety-block">
            <div class="ml-safety-label">Safety Envelope Interlock</div>
            <div class="ml-safety-value" [ngClass]="safetyClass">{{ safetyStatus }}</div>
          </div>
        </div>

        <div class="ml-panel-footer">
          Detection Model: Isolation Forest (n_estimators=100, contamination=5%) + Rolling Z-Score Buffer (window=50)
        </div>
      </div>

      <div class="ml-panel-placeholder" *ngIf="toolId && !mlReady">
        <div class="ml-spinner"></div>
        <span>Calibrating ML baseline…</span>
      </div>
    </div>
  `,
  styles: [`
    .chart-section {
      padding: 24px;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-svg {
      width: 18px;
      height: 18px;
      color: var(--accent-cyan);
    }

    .placeholder-svg {
      width: 44px;
      height: 44px;
      color: var(--text-muted);
      margin-bottom: 12px;
      opacity: 0.4;
    }

    .chart-container {
      position: relative;
      height: 300px;
    }

    .chart-container--full {
      height: 500px;
    }

    .chart-legend {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 16px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    /* ── ML Panel ── */
    .ml-panel {
      margin-top: 20px;
      background: rgba(124, 58, 237, 0.06);
      border: 1px solid rgba(124, 58, 237, 0.25);
      border-radius: 12px;
      overflow: hidden;
    }

    .ml-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: rgba(124, 58, 237, 0.12);
      border-bottom: 1px solid rgba(124, 58, 237, 0.2);
      flex-wrap: wrap;
      gap: 8px;
    }

    .ml-panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      color: #a78bfa;
      letter-spacing: 0.02em;
    }

    .ml-panel-icon {
      width: 16px;
      height: 16px;
      color: #a78bfa;
    }

    .ml-model-badge {
      font-size: 0.65rem;
      font-weight: 600;
      color: #7c3aed;
      background: rgba(124, 58, 237, 0.15);
      border: 1px solid rgba(124, 58, 237, 0.3);
      padding: 2px 8px;
      border-radius: 20px;
    }

    .ml-panel-body {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0;
      align-items: stretch;
    }

    /* Score block */
    .ml-score-block {
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-right: 1px solid rgba(124, 58, 237, 0.15);
      min-width: 120px;
      gap: 3px;
    }

    .ml-score-label {
      font-size: 0.62rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
    }

    .ml-score-value {
      font-size: 1.4rem;
      font-weight: 800;
      font-family: 'Roboto Mono', monospace;
      line-height: 1;
    }

    .ml-confidence {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    /* Feature block */
    .ml-features-block {
      padding: 12px 16px;
    }

    .ml-features-title {
      font-size: 0.65rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .ml-features-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ml-feature-row {
      display: grid;
      grid-template-columns: 70px 52px 80px 1fr;
      align-items: center;
      gap: 6px;
    }

    .ml-feature-name {
      font-size: 0.72rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .ml-feature-sigma {
      font-size: 0.75rem;
      font-weight: 700;
      font-family: 'Roboto Mono', monospace;
    }

    .ml-feature-tag {
      font-size: 0.63rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .ml-feature-bar-track {
      height: 4px;
      background: rgba(255,255,255,0.06);
      border-radius: 2px;
      overflow: hidden;
    }

    .ml-feature-bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.6s ease;
    }

    /* Safety block */
    .ml-safety-block {
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-left: 1px solid rgba(124, 58, 237, 0.15);
      min-width: 120px;
      gap: 3px;
    }

    .ml-safety-label {
      font-size: 0.62rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
      text-align: center;
    }

    .ml-safety-value {
      font-size: 0.72rem;
      font-weight: 700;
      text-align: center;
    }

    /* Color semantics */
    .ml-nominal,
    .z-normal,
    .safety-ok   { color: #10b981; }

    .ml-drift,
    .z-elevated,
    .safety-warn { color: #f59e0b; }

    .ml-outlier,
    .z-spike,
    .safety-crit { color: #ef4444; }

    .ml-feature-bar-fill.ml-nominal,
    .ml-feature-bar-fill.z-normal  { background: #10b981; }
    .ml-feature-bar-fill.ml-drift,
    .ml-feature-bar-fill.z-elevated { background: #f59e0b; }
    .ml-feature-bar-fill.ml-outlier,
    .ml-feature-bar-fill.z-spike   { background: #ef4444; }

    /* Footer */
    .ml-panel-footer {
      padding: 6px 16px;
      background: rgba(0,0,0,0.15);
      border-top: 1px solid rgba(124, 58, 237, 0.1);
      font-size: 0.6rem;
      color: var(--text-muted);
      letter-spacing: 0.02em;
    }

    /* Placeholder while calibrating */
    .ml-panel-placeholder {
      margin-top: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px;
      color: var(--text-muted);
      font-size: 0.8rem;
      opacity: 0.6;
    }

    .ml-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(124, 58, 237, 0.3);
      border-top-color: #7c3aed;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive: stack on narrow */
    @media (max-width: 640px) {
      .ml-panel-body {
        grid-template-columns: 1fr;
      }
      .ml-score-block,
      .ml-safety-block {
        border: none;
        border-top: 1px solid rgba(124, 58, 237, 0.15);
        flex-direction: row;
        justify-content: flex-start;
        gap: 10px;
      }
    }
  `]
})
export class TrendChartComponent implements OnChanges, OnDestroy {
  @Input() toolId: number | null = null;
  @Input() toolName: string = '';
  @Input() fullPage: boolean = false;

  private pollSub: Subscription | null = null;

  // ML state computed from readings
  mlReady = false;
  mlScoreDisplay = '—';
  mlScoreClass = 'ml-nominal';
  mlConfidenceLabel = 'Nominal';
  mlFeatures: MlFeatureZ[] = [];
  safetyStatus = 'Guardrail OK';
  safetyClass = 'safety-ok';

  // Rolling buffers for z-score computation
  private wBuf: number[] = [];
  private eBuf: number[] = [];
  private rBuf: number[] = [];

  chartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Water (L/h)',
        data: [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHitRadius: 8,
        borderWidth: 2,
      },
      {
        label: 'Energy (kWh)',
        data: [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHitRadius: 8,
        borderWidth: 2,
      },
      {
        label: 'Recycling (%)',
        data: [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHitRadius: 8,
        borderWidth: 2,
        yAxisID: 'y1',
      },
    ],
  };

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: 'Inter', weight: 600 },
        bodyFont: { family: 'Inter' },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#64748b',
          font: { family: 'Inter', size: 10 },
          maxTicksLimit: 10,
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        position: 'left',
        title: {
          display: true,
          text: 'Water (L/h) / Energy (kWh)',
          color: '#64748b',
          font: { family: 'Inter', size: 11 },
        },
        ticks: {
          color: '#64748b',
          font: { family: 'Inter', size: 10 },
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y1: {
        position: 'right',
        title: {
          display: true,
          text: 'Recycling (%)',
          color: '#64748b',
          font: { family: 'Inter', size: 11 },
        },
        ticks: {
          color: '#64748b',
          font: { family: 'Inter', size: 10 },
        },
        grid: { drawOnChartArea: false },
        min: 0,
        max: 100,
      },
    },
  };

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['toolId'] && this.toolId) {
      // Reset ML buffers when tool changes
      this.wBuf = [];
      this.eBuf = [];
      this.rBuf = [];
      this.mlReady = false;
      this.startPolling(this.toolId);
    }
  }

  private startPolling(toolId: number) {
    this.pollSub?.unsubscribe();
    this.pollSub = interval(5000).pipe(
      startWith(0),
      switchMap(() => this.api.getToolReadings(toolId, 50))
    ).subscribe(readings => {
      this.updateChart(readings);
      this.updateMlPanel(readings);
    });
  }

  private updateChart(readings: Reading[]) {
    const labels = readings.map(r => {
      const d = new Date(r.recordedAt);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });

    this.chartData = {
      labels,
      datasets: [
        { ...this.chartData.datasets[0], data: readings.map(r => r.waterLph) },
        { ...this.chartData.datasets[1], data: readings.map(r => r.energyKwh) },
        { ...this.chartData.datasets[2], data: readings.map(r => r.recyclingPct) },
      ],
    };
  }

  /**
   * Compute live ML metadata from the readings window.
   * Rolling mean + std of the window = same methodology as the Python simulator.
   */
  private updateMlPanel(readings: Reading[]) {
    if (readings.length < 5) {
      this.mlReady = false;
      return;
    }

    const wVals = readings.map(r => r.waterLph);
    const eVals = readings.map(r => r.energyKwh);
    const rVals = readings.map(r => r.recyclingPct);

    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const std  = (arr: number[], m: number) =>
      Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length);

    const wMean = mean(wVals); const wStd = Math.max(std(wVals, wMean), 0.5);
    const eMean = mean(eVals); const eStd = Math.max(std(eVals, eMean), 0.1);
    const rMean = mean(rVals); const rStd = Math.max(std(rVals, rMean), 0.5);

    // Use last reading as the test point
    const last = readings[readings.length - 1];
    const zW = (last.waterLph    - wMean) / wStd;
    const zE = (last.energyKwh   - eMean) / eStd;
    const zR = (rMean - last.recyclingPct) / rStd; // drop = positive = bad

    const maxZ = Math.max(Math.abs(zW), Math.abs(zE), Math.abs(zR));

    // Approximated IF score (negative = outlier, matching Python IsolationForest sign convention)
    const ifScore = -(maxZ / 10.0);

    const formatZ = (z: number) => (z >= 0 ? '+' : '') + z.toFixed(1) + 'σ';
    const zTag = (z: number): string => {
      const az = Math.abs(z);
      if (az >= 2.5) return 'SPIKE';
      if (az >= 1.5) return 'ELEVATED';
      return 'NORMAL';
    };
    const zClass = (z: number): string => {
      const az = Math.abs(z);
      if (az >= 2.5) return 'z-spike';
      if (az >= 1.5) return 'z-elevated';
      return 'z-normal';
    };

    // Anomaly score display
    if (maxZ >= 2.5) {
      this.mlScoreDisplay = ifScore.toFixed(3);
      this.mlScoreClass = 'ml-outlier';
      this.mlConfidenceLabel = 'HIGH CONFIDENCE';
    } else if (maxZ >= 1.5) {
      this.mlScoreDisplay = ifScore.toFixed(3);
      this.mlScoreClass = 'ml-drift';
      this.mlConfidenceLabel = 'DRIFT DETECTED';
    } else {
      const s = ifScore >= 0 ? '+' : '';
      this.mlScoreDisplay = s + ifScore.toFixed(3);
      this.mlScoreClass = 'ml-nominal';
      this.mlConfidenceLabel = 'NOMINAL';
    }

    // Feature contributions
    this.mlFeatures = [
      {
        label: 'Water (L/h)',
        z: zW,
        sigma: formatZ(zW),
        tag: zTag(zW),
        cssClass: zClass(zW),
      },
      {
        label: 'Energy (kWh)',
        z: zE,
        sigma: formatZ(zE),
        tag: zTag(zE),
        cssClass: zClass(zE),
      },
      {
        label: 'Recycling (%)',
        z: zR,
        sigma: formatZ(zR),
        tag: zTag(zR),
        cssClass: zClass(zR),
      },
    ];

    // Safety envelope: any metric beyond physical guardrail?
    const anyBreach = maxZ > 3.5;
    this.safetyStatus = anyBreach ? 'Interlock Triggered' : 'Guardrail OK';
    this.safetyClass  = anyBreach ? 'safety-crit' : 'safety-ok';

    this.mlReady = true;
  }

  getZBarWidth(z: number): number {
    // Map |z| from 0–4 to 0–100%
    return Math.min(Math.abs(z) / 4.0 * 100, 100);
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }
}
