import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  PaginatedResponse,
  GeneratedTestCase,
  GeneratedTestCaseDetail,
  GenerationSummary,
  CoverageSummary,
  GeneratedTestRun,
  GeneratedTestRunDetail,
  ExecuteTestSuiteRequest,
  ExecuteTestSuiteResponse,
  ImportOpenApiRequest,
  ImportOpenApiResponse,
  GenerateTestSuiteRequest,
  ExtractRulesRequest,
  ExtractRulesResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class TestSuiteService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── OpenAPI Import ───────────────────────────────

  importOpenApi(projectId: string, request: ImportOpenApiRequest): Observable<ApiResponse<ImportOpenApiResponse>> {
    return this.http.post<ApiResponse<ImportOpenApiResponse>>(
      `${this.API_URL}/projects/${projectId}/test-suites/import-openapi`,
      request
    );
  }

  // ─── Test Generation ──────────────────────────────

  generateTestSuite(projectId: string, request: GenerateTestSuiteRequest): Observable<ApiResponse<GenerationSummary>> {
    return this.http.post<ApiResponse<GenerationSummary>>(
      `${this.API_URL}/projects/${projectId}/test-suites/generate`,
      request
    );
  }

  // ─── Test Cases ───────────────────────────────────

  getTestCases(
    projectId: string,
    collectionId: string,
    options?: {
      severity?: string;
      category?: string;
      needsReview?: boolean;
      page?: number;
      pageSize?: number;
    }
  ): Observable<ApiResponse<PaginatedResponse<GeneratedTestCase>>> {
    let params = new HttpParams();
    if (options?.severity) params = params.set('severity', options.severity);
    if (options?.category) params = params.set('category', options.category);
    if (options?.needsReview !== undefined) params = params.set('needsReview', options.needsReview.toString());
    if (options?.page) params = params.set('page', options.page.toString());
    if (options?.pageSize) params = params.set('pageSize', options.pageSize.toString());

    return this.http.get<ApiResponse<PaginatedResponse<GeneratedTestCase>>>(
      `${this.API_URL}/projects/${projectId}/test-suites/${collectionId}/tests`,
      { params }
    );
  }

  getTestCaseDetail(
    projectId: string,
    collectionId: string,
    testId: string
  ): Observable<ApiResponse<GeneratedTestCaseDetail>> {
    return this.http.get<ApiResponse<GeneratedTestCaseDetail>>(
      `${this.API_URL}/projects/${projectId}/test-suites/${collectionId}/tests/${testId}`
    );
  }

  updateTestCase(
    projectId: string,
    collectionId: string,
    testId: string,
    data: Partial<GeneratedTestCaseDetail>
  ): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.API_URL}/projects/${projectId}/test-suites/${collectionId}/tests/${testId}`,
      data
    );
  }

  // ─── Coverage ─────────────────────────────────────

  getCoverageSummary(projectId: string, collectionId: string): Observable<ApiResponse<CoverageSummary>> {
    return this.http.get<ApiResponse<CoverageSummary>>(
      `${this.API_URL}/projects/${projectId}/test-suites/${collectionId}/coverage`
    );
  }

  // ─── Execution ────────────────────────────────────

  executeTestSuite(
    projectId: string,
    collectionId: string,
    request: ExecuteTestSuiteRequest
  ): Observable<ApiResponse<ExecuteTestSuiteResponse>> {
    return this.http.post<ApiResponse<ExecuteTestSuiteResponse>>(
      `${this.API_URL}/projects/${projectId}/test-suites/${collectionId}/execute`,
      request
    );
  }

  // ─── Test Runs ────────────────────────────────────

  getTestRuns(
    projectId: string,
    collectionId: string,
    page = 1,
    pageSize = 20
  ): Observable<ApiResponse<PaginatedResponse<GeneratedTestRun>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ApiResponse<PaginatedResponse<GeneratedTestRun>>>(
      `${this.API_URL}/projects/${projectId}/test-suites/${collectionId}/runs`,
      { params }
    );
  }

  getTestRunDetail(
    projectId: string,
    collectionId: string,
    runId: string
  ): Observable<ApiResponse<GeneratedTestRunDetail>> {
    return this.http.get<ApiResponse<GeneratedTestRunDetail>>(
      `${this.API_URL}/projects/${projectId}/test-suites/${collectionId}/runs/${runId}`
    );
  }

  cancelTestRun(
    projectId: string,
    collectionId: string,
    runId: string
  ): Observable<ApiResponse<{ message: string; runId: string }>> {
    return this.http.post<ApiResponse<{ message: string; runId: string }>>(
      `${this.API_URL}/projects/${projectId}/test-suites/${collectionId}/runs/${runId}/cancel`,
      {}
    );
  }

  cancelStaleTestRuns(projectId: string): Observable<ApiResponse<{ message: string; count: number }>> {
    return this.http.post<ApiResponse<{ message: string; count: number }>>(
      `${this.API_URL}/projects/${projectId}/test-suites/cancel-stale`,
      {}
    );
  }

  // ─── Reports ──────────────────────────────────────

  downloadReport(
    projectId: string,
    collectionId: string,
    runId: string,
    format: 'html' | 'junit' | 'json' = 'html'
  ): Observable<Blob> {
    return this.http.get(
      `${this.API_URL}/projects/${projectId}/test-suites/${collectionId}/runs/${runId}/report?format=${format}`,
      { responseType: 'blob' }
    );
  }

  // ─── SLM Rule Extraction ─────────────────────────

  extractRules(
    projectId: string,
    collectionId: string,
    request: ExtractRulesRequest
  ): Observable<ApiResponse<ExtractRulesResponse>> {
    return this.http.post<ApiResponse<ExtractRulesResponse>>(
      `${this.API_URL}/projects/${projectId}/test-suites/${collectionId}/extract-rules`,
      request
    );
  }
}

