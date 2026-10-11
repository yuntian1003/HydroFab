import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, startWith, shareReplay, catchError, of } from 'rxjs';
import { Tool, ToolStatus, Reading, AnomalyAlert, DailyLeaderboardEntry, AnalyticsSummary } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:5000/api';
  private readonly pollInterval = 5000; // 5 seconds

  constructor(private http: HttpClient) {}

  // --- One-shot calls ---

  getTools(): Observable<Tool[]> {
    return this.http.get<Tool[]>(`${this.baseUrl}/tools`);
  }

  getToolReadings(toolId: number, limit = 50): Observable<Reading[]> {
    return this.http.get<Reading[]>(
      `${this.baseUrl}/tools/${toolId}/readings?limit=${limit}`
    );
  }

  getDailyLeaderboard(): Observable<DailyLeaderboardEntry[]> {
    return this.http.get<DailyLeaderboardEntry[]>(`${this.baseUrl}/analytics/leaderboard`);
  }

  getAnalyticsSummary(): Observable<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>(`${this.baseUrl}/analytics/summary`);
  }

  resolveAlert(alertId: number): Observable<{ message: string; id: number }> {
    return this.http.patch<{ message: string; id: number }>(
      `${this.baseUrl}/alerts/${alertId}/resolve`,
      {}
    );
  }

  getAlertHistory(): Observable<AnomalyAlert[]> {
    return this.http.get<AnomalyAlert[]>(`${this.baseUrl}/alerts/history`).pipe(
      catchError(() => this.http.get<AnomalyAlert[]>(`${this.baseUrl}/alerts?resolved=true`)),
      catchError(() => of([]))
    );
  }

  // --- Polling observables (shared, auto-refreshing) ---

  /** Polls GET /api/tools/status every 5s, shared across subscribers */
  toolStatus$ = interval(this.pollInterval).pipe(
    startWith(0),
    switchMap(() => this.http.get<ToolStatus[]>(`${this.baseUrl}/tools/status`)),
    shareReplay(1)
  );

  /** Polls GET /api/alerts every 5s */
  alerts$ = interval(this.pollInterval).pipe(
    startWith(0),
    switchMap(() => this.http.get<AnomalyAlert[]>(`${this.baseUrl}/alerts`)),
    shareReplay(1)
  );

  /** Polls GET /api/alerts/history every 5s */
  alertHistory$ = interval(this.pollInterval).pipe(
    startWith(0),
    switchMap(() => this.getAlertHistory()),
    shareReplay(1)
  );

  /** Polls GET /api/analytics/leaderboard every 5s */
  leaderboard$ = interval(this.pollInterval).pipe(
    startWith(0),
    switchMap(() => this.getDailyLeaderboard()),
    shareReplay(1)
  );

  /** Polls GET /api/analytics/summary every 5s */
  analyticsSummary$ = interval(this.pollInterval).pipe(
    startWith(0),
    switchMap(() => this.getAnalyticsSummary()),
    shareReplay(1)
  );
}

