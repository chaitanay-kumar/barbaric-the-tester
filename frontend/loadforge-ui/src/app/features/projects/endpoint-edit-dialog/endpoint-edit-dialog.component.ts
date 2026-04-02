import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface EndpointEditData {
  endpoint: any;
  projectId: string;
  collectionId: string;
  mode: 'edit' | 'add';
}

@Component({
  selector: 'app-endpoint-edit-dialog',
  templateUrl: './endpoint-edit-dialog.component.html',
  styleUrls: ['./endpoint-edit-dialog.component.scss']
})
export class EndpointEditDialogComponent implements OnInit {
  form!: FormGroup;
  httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EndpointEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EndpointEditData
  ) {}

  ngOnInit(): void {
    this.isEdit = this.data.mode === 'edit';
    const ep = this.data.endpoint || {};

    this.form = this.fb.group({
      name: [ep.name || '', Validators.required],
      method: [ep.method || 'GET'],
      url: [ep.url || '', Validators.required],
      description: [ep.description || ''],
      requestBody: [ep.requestBody || ''],
      timeoutMs: [ep.timeoutMs || 30000],
      headers: this.fb.array([])
    });

    // Load existing headers
    const headers = ep.headers || [];
    headers.forEach((h: any) => this.addHeader(h.key, h.value, true));

    // Always have one empty row for quick add
    if (this.headersArray.length === 0) {
      this.addHeader('', '', true);
    }
  }

  get headersArray(): FormArray { return this.form.get('headers') as FormArray; }

  addHeader(key = '', value = '', enabled = true): void {
    this.headersArray.push(this.fb.group({ key, value, enabled: [enabled] }));
  }

  removeHeader(i: number): void { this.headersArray.removeAt(i); }

  getMethodColor(method: string): string {
    const c: Record<string, string> = { GET: '#4caf50', POST: '#ff9800', PUT: '#2196f3', PATCH: '#9c27b0', DELETE: '#f44336', HEAD: '#607d8b', OPTIONS: '#795548' };
    return c[method] || '#666';
  }

  save(): void {
    if (this.form.invalid) return;
    const val = this.form.value;
    const headers = val.headers
      .filter((h: any) => h.key?.trim())
      .map((h: any) => ({ key: h.key, value: h.value }));

    this.dialogRef.close({
      name: val.name,
      description: val.description,
      method: val.method,
      url: val.url,
      requestBody: val.requestBody || null,
      timeoutMs: val.timeoutMs,
      headers: headers.length > 0 ? headers : null
    });
  }

  cancel(): void { this.dialogRef.close(null); }
}

