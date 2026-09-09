import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolGridComponent } from './components/tool-grid/tool-grid.component';
import { TrendChartComponent } from './components/trend-chart/trend-chart.component';
import { AlertPanelComponent } from './components/alert-panel/alert-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolGridComponent, TrendChartComponent, AlertPanelComponent],
  template: `
    <div class="app-shell">

      <!-- ── Top Nav ── -->
      <header class="top-nav">
        <div class="nav-brand">
          <span class="brand-icon">⬡</span>
          <div class="brand-text">
            <span class="brand-name">HydroFab</span>
            <span class="brand-tagline">Fab Utility Monitor</span>
          </div>
        </div>

        <div class="nav-center">
          <div class="live-indicator">
            <span class="live-dot"></span>
            LIVE
          </div>
        </div>

        <div class="nav-right">
          <span class="nav-context">Intel Penang — Simulation Mode</span>
          <div class="nav-clock">{{ clock }}</div>
        </div>
      </header>

      <!-- ── Main Layout ── -->
      <main class="app-main">

        <!-- Left column: tool grid -->
        <div class="col-left">
          <app-tool-grid
            (toolSelected)="onToolSelected($event)">
          </app-tool-grid>
        </div>

        <!-- Right column: chart + alerts -->
        <div class="col-right">
          <app-trend-chart [toolId]="selectedToolId"></app-trend-chart>
          <app-alert-panel></app-alert-panel>
        </div>

      </main>

      <!-- ── Footer ── -->
      <footer class="app-footer">
        <span>HydroFab © 2025 — Portfolio Project for Intel SWE Internship</span>
        <span>Polling every 5 s · 20 simulated tools · Stack: Angular · C# · PostgreSQL · Python · Kubernetes</span>
      </footer>

    </div>
  `,
  styles: [`
    .app-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 1;
    }

    /* ── Top Nav ── */
    .top-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      height: 64px;
      background: rgba(10, 14, 26, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border-subtle);
      position: sticky;
      top: 0;
      z-index: 100;
      flex-shrink: 0;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      font-size: 1.8rem;
      background: var(--gradient-brand);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .brand-name {
      font-size: 1.1rem;
      font-weight: 800;
      background: var(--gradient-brand);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
    }

    .brand-tagline {
      font-size: 0.65rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 500;
    }

    .nav-center {
      display: flex;
      align-items: center;
    }

    .live-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: var(--status-normal);
      background: var(--status-normal-bg);
      padding: 4px 12px;
      border-radius: 20px;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--status-normal);
      animation: livePulse 1.5s ease-in-out infinite;
    }

    @keyframes livePulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }

    .nav-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .nav-context {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .nav-clock {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      font-variant-numeric: tabular-nums;
    }

    /* ── Main Layout ── */
    .app-main {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 24px;
      padding: 28px;
      max-width: 1600px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }

    .col-left {
      min-width: 0;
    }

    .col-right {
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 0;
    }

    /* ── Footer ── */
    .app-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 28px;
      border-top: 1px solid var(--border-subtle);
      font-size: 0.72rem;
      color: var(--text-muted);
      flex-wrap: wrap;
      gap: 8px;
      background: rgba(10, 14, 26, 0.6);
    }

    /* ── Responsive ── */
    @media (max-width: 1200px) {
      .app-main {
        grid-template-columns: 1fr;
      }
      .col-right {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 768px) {
      .top-nav { padding: 0 16px; }
      .app-main { padding: 16px; gap: 16px; }
      .col-right { grid-template-columns: 1fr; }
      .nav-context { display: none; }
    }
  `]
})
export class AppComponent {
  selectedToolId: number | null = null;
  clock = '';

  constructor() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  }

  onToolSelected(toolId: number) {
    this.selectedToolId = toolId;
  }

  private updateClock() {
    this.clock = new Date().toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
}
