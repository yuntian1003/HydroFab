import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Subscription, interval, switchMap, startWith } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { Reading } from '../../models/models';

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="chart-section glass-card animate-in">
      <div class="chart-header">
        <h2 class="section-title">
          <span class="title-icon">📈</span>
          Trend Analysis
        </h2>
        <span class="chart-tool-name" *ngIf="toolId">
          Tool #{{ toolId }}
        </span>
      </div>

      <div class="chart-placeholder" *ngIf="!toolId">
        <div class="placeholder-icon">📊</div>
        <p>Select a tool from the grid to view its trend data</p>
      </div>

      <div class="chart-container" *ngIf="toolId">
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
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-icon { font-size: 1.1rem; }

    .chart-tool-name {
      font-size: 0.85rem;
      color: var(--text-secondary);
      background: var(--bg-glass);
      padding: 4px 12px;
      border-radius: 20px;
      border: 1px solid var(--border-subtle);
    }

    .chart-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--text-muted);
      text-align: center;
    }

    .placeholder-icon {
      font-size: 3rem;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .chart-container {
      position: relative;
      height: 300px;
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
  `]
})
export class TrendChartComponent implements OnChanges, OnDestroy {
  @Input() toolId: number | null = null;

  private pollSub: Subscription | null = null;

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
        titleFont: { family: 'Inter', weight: '600' },
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
      this.startPolling(this.toolId);
    }
  }

  private startPolling(toolId: number) {
    this.pollSub?.unsubscribe();
    this.pollSub = interval(5000).pipe(
      startWith(0),
      switchMap(() => this.api.getToolReadings(toolId, 50))
    ).subscribe(readings => this.updateChart(readings));
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

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }
}
