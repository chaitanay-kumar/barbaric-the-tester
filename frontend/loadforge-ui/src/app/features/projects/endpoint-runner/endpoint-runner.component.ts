import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';

@Component({
  selector: 'app-endpoint-runner',
  templateUrl: './endpoint-runner.component.html',
  styleUrls: ['./endpoint-runner.component.scss']
})
export class EndpointRunnerComponent implements OnChanges {
  @Input() projectId = '';
  @Input() collectionId = '';
  @Input() endpoint: any = null;
  @Input() environments: any[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form!: FormGroup;
  httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  authTypes = ['none', 'bearer', 'apikey', 'basic'];
  selectedAuthType = 'none';
  activeRequestTab = 0;
  activeResponseTab = 0;

  // Response
  isExecuting = false;
  isSaving = false;
  response: any = null;
  responseBodyFormatted = '';

  constructor(private fb: FormBuilder, private projectService: ProjectService) {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['endpoint'] && this.endpoint) {
      this.form.patchValue({
        method: this.endpoint.method || 'GET',
        url: this.endpoint.url || '',
        body: this.endpoint.requestBody || '',
        environmentId: ''
      });
      this.setHeaders(this.endpoint.headers || []);
      this.detectAuth(this.endpoint.headers || []);
      this.response = null;
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      method: ['GET'],
      url: [''],
      body: [''],
      authType: ['none'],
      authToken: [''],
      authKey: [''],
      authValue: [''],
      basicUser: [''],
      basicPass: [''],
      environmentId: [''],
      headers: this.fb.array([]),
      queryParams: this.fb.array([])
    });
  }

  get headers(): FormArray { return this.form.get('headers') as FormArray; }
  get queryParams(): FormArray { return this.form.get('queryParams') as FormArray; }

  addHeader(key = '', value = ''): void {
    this.headers.push(this.fb.group({ key, value, enabled: [true] }));
  }

  removeHeader(i: number): void { this.headers.removeAt(i); }

  addQueryParam(key = '', value = ''): void {
    this.queryParams.push(this.fb.group({ key, value }));
  }

  removeQueryParam(i: number): void { this.queryParams.removeAt(i); }

  setHeaders(hdrs: any[]): void {
    this.headers.clear();
    hdrs.forEach(h => this.addHeader(h.key, h.value));
  }

  detectAuth(hdrs: any[]): void {
    const authHeader = hdrs.find((h: any) => h.key?.toLowerCase() === 'authorization');
    if (authHeader) {
      const val = authHeader.value || '';
      if (val.startsWith('Bearer ')) {
        this.selectedAuthType = 'bearer';
        this.form.patchValue({ authType: 'bearer', authToken: val.replace('Bearer ', '') });
      } else if (val.startsWith('Basic ')) {
        this.selectedAuthType = 'basic';
      }
    }
  }

  onAuthTypeChange(type: string): void {
    this.selectedAuthType = type;
    this.form.patchValue({ authType: type });
  }

  getMethodColor(method: string): string {
    const colors: Record<string, string> = { GET: '#4caf50', POST: '#ff9800', PUT: '#2196f3', PATCH: '#9c27b0', DELETE: '#f44336', HEAD: '#607d8b', OPTIONS: '#795548' };
    return colors[method] || '#666';
  }

  getStatusColor(code: number): string {
    if (code >= 200 && code < 300) return '#4caf50';
    if (code >= 300 && code < 400) return '#ff9800';
    if (code >= 400 && code < 500) return '#f44336';
    if (code >= 500) return '#9c27b0';
    return '#666';
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  send(): void {
    this.isExecuting = true;
    this.response = null;

    // Build URL with query params
    let url = this.form.value.url;
    const params = this.queryParams.value.filter((p: any) => p.key);
    if (params.length > 0) {
      const qs = params.map((p: any) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      url += (url.includes('?') ? '&' : '?') + qs;
    }

    // Build headers
    const headers = this.headers.value.filter((h: any) => h.enabled && h.key).map((h: any) => ({ key: h.key, value: h.value }));

    // Auth
    let authToken: string | undefined;
    if (this.selectedAuthType === 'bearer') {
      authToken = this.form.value.authToken;
    } else if (this.selectedAuthType === 'apikey') {
      headers.push({ key: this.form.value.authKey, value: this.form.value.authValue });
    } else if (this.selectedAuthType === 'basic') {
      authToken = undefined;
      const encoded = btoa(`${this.form.value.basicUser}:${this.form.value.basicPass}`);
      headers.push({ key: 'Authorization', value: `Basic ${encoded}` });
    }

    const envId = this.form.value.environmentId || undefined;

    const payload = {
      method: this.form.value.method,
      url,
      body: this.form.value.body || undefined,
      authToken,
      environmentId: envId,
      headers: headers.length > 0 ? headers : undefined
    };

    const obs = this.endpoint?.id && this.collectionId
      ? this.projectService.executeEndpoint(this.projectId, this.collectionId, this.endpoint.id, payload)
      : this.projectService.executeAdhoc(this.projectId, payload);

    obs.subscribe({
      next: (res) => {
        this.response = res.data;
        this.formatResponseBody();
        this.isExecuting = false;
        this.activeResponseTab = 0;
      },
      error: (err) => {
        this.response = { statusCode: 0, statusText: 'Error', error: err.message || 'Request failed', durationMs: 0 };
        this.isExecuting = false;
      }
    });
  }

  formatResponseBody(): void {
    if (!this.response?.responseBody) { this.responseBodyFormatted = ''; return; }
    try {
      const parsed = JSON.parse(this.response.responseBody);
      this.responseBodyFormatted = JSON.stringify(parsed, null, 2);
    } catch {
      this.responseBodyFormatted = this.response.responseBody;
    }
  }

  saveEndpoint(): void {
    if (!this.endpoint?.id || !this.collectionId) return;
    this.isSaving = true;

    const allHeaders = this.headers.value
      .filter((h: any) => h.enabled && h.key)
      .map((h: any) => ({ key: h.key, value: h.value }));

    // Add auth as header
    if (this.selectedAuthType === 'bearer' && this.form.value.authToken) {
      allHeaders.push({ key: 'Authorization', value: `Bearer ${this.form.value.authToken}` });
    } else if (this.selectedAuthType === 'apikey' && this.form.value.authKey) {
      allHeaders.push({ key: this.form.value.authKey, value: this.form.value.authValue });
    } else if (this.selectedAuthType === 'basic' && this.form.value.basicUser) {
      const encoded = btoa(`${this.form.value.basicUser}:${this.form.value.basicPass}`);
      allHeaders.push({ key: 'Authorization', value: `Basic ${encoded}` });
    }

    const data = {
      name: this.endpoint.name,
      method: this.form.value.method,
      url: this.form.value.url,
      requestBody: this.form.value.body || null,
      headers: allHeaders.length > 0 ? allHeaders : null
    };

    this.projectService.updateEndpoint(this.projectId, this.collectionId, this.endpoint.id, data).subscribe({
      next: () => {
        this.isSaving = false;
        this.saved.emit();
      },
      error: () => { this.isSaving = false; }
    });
  }

  close(): void { this.closed.emit(); }
}

