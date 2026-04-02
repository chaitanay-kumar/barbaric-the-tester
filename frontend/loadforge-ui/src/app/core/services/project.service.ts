import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse, Project, ProjectDetail } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly API_URL = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  getProjects(page = 1, pageSize = 20): Observable<ApiResponse<PaginatedResponse<Project>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<ApiResponse<PaginatedResponse<Project>>>(this.API_URL, { params });
  }

  getProject(id: string): Observable<ApiResponse<ProjectDetail>> {
    return this.http.get<ApiResponse<ProjectDetail>>(`${this.API_URL}/${id}`);
  }

  createProject(data: { name: string; slug: string; description?: string; defaultBaseUrl?: string }): Observable<ApiResponse<ProjectDetail>> {
    return this.http.post<ApiResponse<ProjectDetail>>(this.API_URL, data);
  }

  updateProject(id: string, data: { name?: string; description?: string }): Observable<ApiResponse<ProjectDetail>> {
    return this.http.put<ApiResponse<ProjectDetail>>(`${this.API_URL}/${id}`, data);
  }

  deleteProject(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`);
  }

  // Environments
  addEnvironment(projectId: string, data: { name: string; baseUrl: string; isDefault: boolean }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/${projectId}/environments`, data);
  }

  updateEnvironment(projectId: string, envId: string, data: { name: string; baseUrl: string; isDefault: boolean }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/${projectId}/environments/${envId}`, data);
  }

  deleteEnvironment(projectId: string, envId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${projectId}/environments/${envId}`);
  }

  // Collections
  addCollection(projectId: string, data: { name: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/${projectId}/collections`, data);
  }

  deleteCollection(projectId: string, collectionId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${projectId}/collections/${collectionId}`);
  }

  getCollection(projectId: string, collectionId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/${projectId}/collections/${collectionId}`);
  }

  addEndpoint(projectId: string, collectionId: string, data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/${projectId}/collections/${collectionId}/endpoints`, data);
  }

  updateEndpoint(projectId: string, collectionId: string, endpointId: string, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.API_URL}/${projectId}/collections/${collectionId}/endpoints/${endpointId}`, data);
  }

  deleteEndpoint(projectId: string, collectionId: string, endpointId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${projectId}/collections/${collectionId}/endpoints/${endpointId}`);
  }

  // Import
  importCollection(projectId: string, content: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/${projectId}/collections/import`, { content });
  }

  // Execute
  executeEndpoint(projectId: string, collectionId: string, endpointId: string, payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/${projectId}/collections/${collectionId}/endpoints/${endpointId}/execute`, payload);
  }

  executeAdhoc(projectId: string, payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/projects/${projectId}/execute-adhoc`, payload);
  }

  // Scenarios
  addScenario(projectId: string, data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/${projectId}/scenarios`, data);
  }

  deleteScenario(projectId: string, scenarioId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${projectId}/scenarios/${scenarioId}`);
  }
}

