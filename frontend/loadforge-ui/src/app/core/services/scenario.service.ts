import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse, Scenario } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ScenarioService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getScenarios(projectId: string, page = 1, pageSize = 20): Observable<ApiResponse<PaginatedResponse<Scenario>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<ApiResponse<PaginatedResponse<Scenario>>>(`${this.API_URL}/projects/${projectId}/scenarios`, { params });
  }

  getScenario(projectId: string, scenarioId: string): Observable<ApiResponse<Scenario>> {
    return this.http.get<ApiResponse<Scenario>>(`${this.API_URL}/projects/${projectId}/scenarios/${scenarioId}`);
  }

  createScenario(projectId: string, data: Partial<Scenario>): Observable<ApiResponse<Scenario>> {
    return this.http.post<ApiResponse<Scenario>>(`${this.API_URL}/projects/${projectId}/scenarios`, data);
  }

  updateScenario(projectId: string, scenarioId: string, data: Partial<Scenario>): Observable<ApiResponse<Scenario>> {
    return this.http.put<ApiResponse<Scenario>>(`${this.API_URL}/projects/${projectId}/scenarios/${scenarioId}`, data);
  }

  deleteScenario(projectId: string, scenarioId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/projects/${projectId}/scenarios/${scenarioId}`);
  }
}

