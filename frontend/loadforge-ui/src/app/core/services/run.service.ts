import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse, TestRun, RunMetrics, ThresholdResult } from '../models';

@Injectable({
  providedIn: 'root'
})
export class RunService {
  private readonly API_URL = `${environment.apiUrl}/runs`;

  constructor(private http: HttpClient) {}

  getRuns(page = 1, pageSize = 20, scenarioId?: string): Observable<ApiResponse<PaginatedResponse<TestRun>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (scenarioId) {
      params = params.set('scenarioId', scenarioId);
    }

    return this.http.get<ApiResponse<PaginatedResponse<TestRun>>>(this.API_URL, { params });
  }

  getRun(runId: string): Observable<ApiResponse<TestRun>> {
    return this.http.get<ApiResponse<TestRun>>(`${this.API_URL}/${runId}`);
  }

  startRun(scenarioId: string, environmentId: string): Observable<ApiResponse<TestRun>> {
    return this.http.post<ApiResponse<TestRun>>(`${this.API_URL}/start`, { scenarioId, environmentId });
  }

  stopRun(runId: string): Observable<ApiResponse<TestRun>> {
    return this.http.post<ApiResponse<TestRun>>(`${this.API_URL}/${runId}/stop`, {});
  }

  getRunMetrics(runId: string): Observable<ApiResponse<RunMetrics[]>> {
    return this.http.get<ApiResponse<RunMetrics[]>>(`${this.API_URL}/${runId}/metrics`);
  }

  getThresholdResults(runId: string): Observable<ApiResponse<ThresholdResult[]>> {
    return this.http.get<ApiResponse<ThresholdResult[]>>(`${this.API_URL}/${runId}/thresholds`);
  }

  setBaseline(runId: string): Observable<ApiResponse<TestRun>> {
    return this.http.post<ApiResponse<TestRun>>(`${this.API_URL}/${runId}/baseline`, {});
  }

  compareToBaseline(runId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/${runId}/compare`);
  }
}

