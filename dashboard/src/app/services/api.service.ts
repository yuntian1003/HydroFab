import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, switchMap, startWith, shareReplay } from 'rxjs';
import { Tool, ToolStatus, Reading, AnomalyAlert } from '../models/models';

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

  resolveAlert(alertId: number): Observable<{ message: string; id: number }> {
    return this.http.patch<{ message: string; id: number }>(
      `${this.baseUrl}/alerts/${alertId}/resolve`,
      {}
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
}
