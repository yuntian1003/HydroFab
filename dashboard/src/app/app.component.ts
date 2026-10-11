import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToolGridComponent } from './components/tool-grid/tool-grid.component';
import { TrendChartComponent } from './components/trend-chart/trend-chart.component';
import { AlertPanelComponent } from './components/alert-panel/alert-panel.component';
import { AnalyticsViewComponent } from './components/analytics-view/analytics-view.component';
import { RulesViewComponent } from './components/rules-view/rules-view.component';
import { SettingsViewComponent } from './components/settings-view/settings-view.component';
import { ApiService } from './services/api.service';

type ActiveTab = 'monitor' | 'analytics' | 'rules' | 'settings' | 'trend';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ToolGridComponent,
    TrendChartComponent,
    AlertPanelComponent,
    AnalyticsViewComponent,
    RulesViewComponent,
    SettingsViewComponent,
  ],
  template: `
    <div class="app-shell">

      <!-- ── Top Navigation Bar ── -->
      <header class="top-nav">
        <div class="nav-left">
          <!-- Hamburger Toggle Button -->
          <button
            class="hamburger-btn"
            (click)="toggleSidebar()"
            [attr.aria-expanded]="isSidebarOpen"
            title="Toggle Navigation Menu"
          >
            <svg class="hamburger-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <!-- Brand Logo -->
          <div class="nav-brand" (click)="setTab('monitor')">
            <svg class="brand-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            <div class="brand-text">
              <span class="brand-name">HydroFab</span>
              <span class="brand-tagline">Fab Utility Monitor</span>
            </div>
          </div>
        </div>

        <div class="nav-center">
          <div class="live-indicator">
            <span class="live-dot"></span>
            STREAMING (5s)
          </div>
        </div>

        <div class="nav-right">
          <span class="nav-context">Manufacturing Plant · Bay A-D</span>
          <div class="nav-clock">{{ clock }}</div>
        </div>
      </header>

      <!-- ── Body Shell with Sidebar + Content ── -->
      <div class="app-body">

        <!-- ── Sidebar Drawer Backdrop ── -->
        <div
          class="sidebar-backdrop"
          *ngIf="isSidebarOpen"
          (click)="closeSidebar()"
        ></div>

        <!-- ── Collapsible / Slide-in Sidebar ── -->
        <aside
          class="app-sidebar"
          [class.app-sidebar--open]="isSidebarOpen"
        >
          <div class="sidebar-header">
            <span class="sidebar-section-title">NAVIGATION</span>
            <button class="close-sidebar-btn" (click)="closeSidebar()">✕</button>
          </div>

          <button
            class="nav-tab-btn"
            [class.nav-tab-btn--active]="activeTab === 'monitor'"
            (click)="selectTabAndClose('monitor')"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <div class="tab-text">
              <span class="tab-label">Live Monitor</span>
              <span class="tab-sub">20 Tools &amp; Telemetry</span>
            </div>
            <span class="tab-badge" *ngIf="activeAlertCount > 0">{{ activeAlertCount }}</span>
          </button>

          <button
            class="nav-tab-btn"
            [class.nav-tab-btn--active]="activeTab === 'analytics'"
            (click)="selectTabAndClose('analytics')"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <div class="tab-text">
              <span class="tab-label">Daily Leaderboard</span>
              <span class="tab-sub">24h Anomaly Tracker</span>
            </div>
          </button>

          <div class="sidebar-section-title" style="margin-top: 16px;">CRITERIA &amp; CONFIG</div>

          <button
            class="nav-tab-btn"
            [class.nav-tab-btn--active]="activeTab === 'rules'"
            (click)="selectTabAndClose('rules')"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <div class="tab-text">
              <span class="tab-label">Detection Rules</span>
              <span class="tab-sub">Thresholds &amp; Formulas</span>
            </div>
          </button>

          <button
            class="nav-tab-btn"
            [class.nav-tab-btn--active]="activeTab === 'settings'"
            (click)="selectTabAndClose('settings')"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <div class="tab-text">
              <span class="tab-label">System Architecture</span>
              <span class="tab-sub">Microservices &amp; Config</span>
            </div>
          </button>

          <!-- Sidebar Quick Summary Card -->
          <div class="sidebar-summary-card glass-card">
            <span class="summary-card-title">Threshold Quick Reference</span>
            <p class="summary-card-p">
              • <strong>Warning:</strong> &gt;100% capacity<br>
              • <strong>Critical:</strong> &gt;130% capacity<br>
              • <strong>Recycle Min:</strong> Target ≥80%
            </p>
            <a class="summary-card-link" (click)="selectTabAndClose('rules')">View threshold matrix →</a>
          </div>
        </aside>

        <!-- ── Main Content View ── -->
        <main class="app-main-content">

          <!-- View 1: Live Monitor -->
          <div *ngIf="activeTab === 'monitor'" class="monitor-layout animate-in">
            <div class="col-left">
              <app-tool-grid (toolSelected)="onToolSelected($event)"></app-tool-grid>
            </div>
            <div class="col-right">
              <app-alert-panel></app-alert-panel>
            </div>
          </div>

          <!-- View 1b: Tool Trend Page (grid left + chart right) -->
          <div *ngIf="activeTab === 'trend'" class="animate-in">
            <div class="trend-page-header">
              <button class="back-btn" (click)="setTab('monitor')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:15px;height:15px;"><polyline points="15 18 9 12 15 6"></polyline></svg>
                Back to Monitor
              </button>
              <div class="trend-page-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;color:var(--accent-cyan);"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                <div>
                  <h1 class="trend-tool-heading">{{ selectedToolName || 'Select a Tool' }}</h1>
                  <span class="trend-tool-sub">{{ selectedToolId ? 'Tool #' + selectedToolId + ' · Real-time Trend Analysis' : 'Click any tool to view its trend' }}</span>
                </div>
              </div>
            </div>
            <div class="trend-page-layout">
              <div class="trend-col-grid">
                <app-tool-grid (toolSelected)="onToolSelected($event)"></app-tool-grid>
              </div>
              <div class="trend-col-chart">
                <app-trend-chart [toolId]="selectedToolId" [toolName]="selectedToolName" [fullPage]="true"></app-trend-chart>
              </div>
            </div>
          </div>

          <!-- View 2: Daily Analytics & Leaderboard -->
          <div *ngIf="activeTab === 'analytics'">
            <app-analytics-view></app-analytics-view>
          </div>

          <!-- View 3: Detection Rules & Thresholds -->
          <div *ngIf="activeTab === 'rules'">
            <app-rules-view></app-rules-view>
          </div>

          <!-- View 4: System Settings -->
          <div *ngIf="activeTab === 'settings'">
            <app-settings-view></app-settings-view>
          </div>

        </main>

      </div>

      <!-- ── Footer ── -->
      <footer class="app-footer">
        <span>HydroFab — Utility Monitoring Platform</span>
        <span>Polling 5s · 20 Tools · Stack: Angular 18 · ASP.NET Core 8 · PostgreSQL 16 · Python 3.12</span>
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
      padding: 0 24px;
      height: 62px;
      background: rgba(10, 14, 26, 0.90);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border-subtle);
      position: sticky;
      top: 0;
      z-index: 100;
      flex-shrink: 0;
    }

    .nav-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    /* Hamburger Button */
    .hamburger-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: var(--bg-glass);
      border: 1px solid var(--border-glass);
      color: var(--text-primary);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .hamburger-btn:hover {
      background: var(--bg-glass-hover);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .hamburger-svg {
      width: 20px;
      height: 20px;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }

    .brand-svg {
      width: 26px;
      height: 26px;
      color: var(--accent-blue);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .brand-name {
      font-size: 1.15rem;
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
      font-size: 0.68rem;
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

    /* ── Body Shell ── */
    .app-body {
      display: flex;
      flex: 1;
      position: relative;
      min-height: calc(100vh - 62px - 45px);
    }

    /* ── Sidebar Backdrop (for slide-in overlay) ── */
    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 90;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* ── Collapsible Sidebar (Drawer) ── */
    .app-sidebar {
      position: fixed;
      top: 62px;
      left: 0;
      bottom: 0;
      width: 270px;
      background: rgba(10, 14, 26, 0.96);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border-right: 1px solid var(--border-glass);
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 95;
      transform: translateX(-100%);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
    }

    .app-sidebar--open {
      transform: translateX(0);
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 4px 8px;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 6px;
    }

    .close-sidebar-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1rem;
      padding: 4px;
    }

    .close-sidebar-btn:hover { color: var(--text-primary); }

    .sidebar-section-title {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .nav-tab-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: var(--radius-md);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      cursor: pointer;
      text-align: left;
      transition: all var(--transition-fast);
      position: relative;
    }

    .nav-tab-btn:hover {
      background: var(--bg-glass-hover);
      color: var(--text-primary);
    }

    .nav-tab-btn--active {
      background: rgba(59, 130, 246, 0.14) !important;
      border-color: rgba(59, 130, 246, 0.3) !important;
      color: var(--text-primary) !important;
    }

    .tab-svg {
      width: 18px;
      height: 18px;
      color: var(--accent-cyan);
      flex-shrink: 0;
    }

    .tab-text {
      display: flex;
      flex-direction: column;
      flex: 1;
      line-height: 1.2;
    }

    .tab-label {
      font-weight: 600;
      font-size: 0.85rem;
    }

    .tab-sub {
      font-size: 0.68rem;
      color: var(--text-muted);
    }

    .tab-badge {
      font-size: 0.68rem;
      font-weight: 700;
      background: var(--status-critical);
      color: white;
      padding: 2px 7px;
      border-radius: 10px;
    }

    .sidebar-summary-card {
      margin-top: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .summary-card-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .summary-card-p {
      font-size: 0.7rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .summary-card-link {
      font-size: 0.7rem;
      color: var(--accent-cyan);
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
    }

    .summary-card-link:hover {
      text-decoration: underline;
    }

    /* ── Main Content Area (Full width with side margin) ── */
    .app-main-content {
      flex: 1;
      padding: 24px;
      max-width: 1650px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
    }

    /* ── Monitor View Layout ── */
    .monitor-layout {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 24px;
      align-items: start;
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
      padding: 12px 24px;
      border-top: 1px solid var(--border-subtle);
      font-size: 0.72rem;
      color: var(--text-muted);
      flex-wrap: wrap;
      gap: 8px;
      background: rgba(10, 14, 26, 0.90);
    }

    /* ── Responsive ── */
    @media (max-width: 1200px) {
      .monitor-layout {
        grid-template-columns: 1fr;
      }
      .col-right {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 768px) {
      .top-nav { padding: 0 14px; }
      .app-main-content { padding: 14px; }
      .col-right { grid-template-columns: 1fr; }
      .nav-context { display: none; }
    }

    /* ── Trend Page Layout ── */
    .trend-page-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: var(--radius-sm);
      background: var(--bg-glass);
      border: 1px solid var(--border-glass);
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      font-family: var(--font-family);
      transition: all var(--transition-fast);
      flex-shrink: 0;
    }

    .back-btn:hover {
      background: var(--bg-glass-hover);
      color: var(--text-primary);
      border-color: rgba(255,255,255,0.2);
    }

    .trend-page-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .trend-tool-heading {
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: var(--gradient-brand);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0;
    }

    .trend-tool-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 500;
    }

    .trend-page-layout {
      display: grid;
      grid-template-columns: 1fr 520px;
      gap: 24px;
      align-items: start;
    }

    .trend-col-grid {
      min-width: 0;
    }

    .trend-col-chart {
      position: sticky;
      top: 86px;
      min-width: 0;
    }

    @media (max-width: 1400px) {
      .trend-page-layout {
        grid-template-columns: 1fr 420px;
      }
    }

    @media (max-width: 1100px) {
      .trend-page-layout {
        grid-template-columns: 1fr;
      }
      .trend-col-chart {
        position: static;
      }
    }
  `]
})
export class AppComponent implements OnDestroy {
  activeTab: ActiveTab = 'monitor';
  selectedToolId: number | null = null;
  selectedToolName: string = '';
  clock = '';
  activeAlertCount = 0;
  isSidebarOpen = false;

  private alertSub: Subscription;

  constructor(private api: ApiService) {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    this.alertSub = this.api.alerts$.subscribe(alerts => {
      this.activeAlertCount = alerts.length;
    });
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  setTab(tab: ActiveTab) {
    this.activeTab = tab;
  }

  selectTabAndClose(tab: ActiveTab) {
    this.activeTab = tab;
    this.closeSidebar();
  }

  onToolSelected(event: { toolId: number; toolName: string }) {
    this.selectedToolId = event.toolId;
    this.selectedToolName = event.toolName;
    this.activeTab = 'trend';
  }

  private updateClock() {
    this.clock = new Date().toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  ngOnDestroy() {
    this.alertSub?.unsubscribe();
  }
}
