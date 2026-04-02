import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ProjectService } from '../../../core/services/project.service';
import { ProjectDetail } from '../../../core/models';
import { EndpointEditDialogComponent } from '../endpoint-edit-dialog/endpoint-edit-dialog.component';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  project: ProjectDetail | null = null;
  projectId = '';
  isLoading = true;
  selectedTab = 0;
  isEditing = false;
  editForm!: FormGroup;
  showEnvForm = false;
  envForm!: FormGroup;
  editingEnvId: string | null = null;
  showCollectionForm = false;
  collectionForm!: FormGroup;
  showScenarioForm = false;
  scenarioForm!: FormGroup;
  executionTypes = ['Load', 'Ramp', 'Spike', 'Stress', 'Soak'];

  // Collection detail
  expandedCollectionId: string | null = null;
  collectionEndpoints: any[] = [];
  loadingEndpoints = false;
  showEndpointForm = false;
  endpointForm!: FormGroup;
  editingEndpointId: string | null = null;
  httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  // Import
  showImportForm = false;
  importContent = '';
  isImporting = false;

  // Runner
  runnerEndpoint: any = null;
  runnerCollectionId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private projectService: ProjectService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    this.editForm = this.fb.group({ name: ['', Validators.required], description: [''] });
    this.envForm = this.fb.group({
      name: ['', Validators.required],
      baseUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      isDefault: [false]
    });
    this.collectionForm = this.fb.group({ name: ['', Validators.required] });
    this.scenarioForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      executionType: ['Load', Validators.required]
    });
    this.endpointForm = this.fb.group({
      name: ['', Validators.required],
      method: ['GET'],
      url: ['', Validators.required],
      requestBody: [''],
      timeoutMs: [30000]
    });
    this.loadProject();
  }

  loadProject(): void {
    this.isLoading = true;
    this.projectService.getProject(this.projectId).subscribe({
      next: (res) => {
        if (res.success && res.data) this.project = res.data;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  // --- Edit Project ---
  startEditing(): void {
    if (!this.project) return;
    this.editForm.patchValue({ name: this.project.name, description: this.project.description || '' });
    this.isEditing = true;
  }
  cancelEditing(): void { this.isEditing = false; }
  saveProject(): void {
    if (this.editForm.invalid) return;
    this.projectService.updateProject(this.projectId, this.editForm.value).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.project = { ...this.project!, name: res.data.name, description: res.data.description };
        }
        this.isEditing = false;
        this.snackBar.open('Project updated', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to update', 'Close', { duration: 3000 })
    });
  }
  deleteProject(): void {
    if (!this.project || !confirm(`Delete "${this.project.name}"? This cannot be undone.`)) return;
    this.projectService.deleteProject(this.projectId).subscribe({
      next: () => { this.snackBar.open('Project deleted', 'Close', { duration: 2000 }); this.router.navigate(['/projects']); },
      error: () => this.snackBar.open('Failed to delete', 'Close', { duration: 3000 })
    });
  }

  // --- Environments ---
  toggleEnvForm(env?: any): void {
    if (env) { this.editingEnvId = env.id; this.envForm.patchValue(env); }
    else { this.editingEnvId = null; this.envForm.reset({ isDefault: false }); }
    this.showEnvForm = true;
  }
  cancelEnvForm(): void { this.showEnvForm = false; this.editingEnvId = null; }
  saveEnvironment(): void {
    if (this.envForm.invalid) return;
    const obs = this.editingEnvId
      ? this.projectService.updateEnvironment(this.projectId, this.editingEnvId, this.envForm.value)
      : this.projectService.addEnvironment(this.projectId, this.envForm.value);
    obs.subscribe({
      next: () => { this.showEnvForm = false; this.editingEnvId = null; this.loadProject(); },
      error: () => this.snackBar.open('Failed', 'Close', { duration: 3000 })
    });
  }
  deleteEnvironment(env: any): void {
    if (!confirm(`Delete environment "${env.name}"?`)) return;
    this.projectService.deleteEnvironment(this.projectId, env.id).subscribe({
      next: () => this.loadProject(),
      error: () => this.snackBar.open('Failed', 'Close', { duration: 3000 })
    });
  }

  // --- Collections ---
  toggleCollectionForm(): void { this.collectionForm.reset(); this.showCollectionForm = !this.showCollectionForm; }
  saveCollection(): void {
    if (this.collectionForm.invalid) return;
    this.projectService.addCollection(this.projectId, this.collectionForm.value).subscribe({
      next: () => { this.showCollectionForm = false; this.loadProject(); },
      error: () => this.snackBar.open('Failed', 'Close', { duration: 3000 })
    });
  }
  deleteCollection(col: any): void {
    if (!confirm(`Delete collection "${col.name}"?`)) return;
    this.projectService.deleteCollection(this.projectId, col.id).subscribe({
      next: () => this.loadProject(),
      error: () => this.snackBar.open('Failed', 'Close', { duration: 3000 })
    });
  }

  // --- Scenarios ---
  toggleScenarioForm(): void { this.scenarioForm.reset({ executionType: 'Load' }); this.showScenarioForm = !this.showScenarioForm; }
  saveScenario(): void {
    if (this.scenarioForm.invalid) return;
    this.projectService.addScenario(this.projectId, this.scenarioForm.value).subscribe({
      next: () => { this.showScenarioForm = false; this.loadProject(); },
      error: () => this.snackBar.open('Failed', 'Close', { duration: 3000 })
    });
  }
  deleteScenario(s: any): void {
    if (!confirm(`Delete scenario "${s.name}"?`)) return;
    this.projectService.deleteScenario(this.projectId, s.id).subscribe({
      next: () => this.loadProject(),
      error: () => this.snackBar.open('Failed', 'Close', { duration: 3000 })
    });
  }

  // --- Collection Expand + Endpoints ---
  toggleCollection(col: any): void {
    if (this.expandedCollectionId === col.id) {
      this.expandedCollectionId = null;
      this.collectionEndpoints = [];
      this.showEndpointForm = false;
      return;
    }
    this.expandedCollectionId = col.id;
    this.loadEndpoints(col.id);
  }

  loadEndpoints(colId: string): void {
    this.loadingEndpoints = true;
    this.projectService.getCollection(this.projectId, colId).subscribe({
      next: (res) => {
        this.collectionEndpoints = res.success && res.data ? res.data.endpoints || [] : [];
        this.loadingEndpoints = false;
      },
      error: () => { this.collectionEndpoints = []; this.loadingEndpoints = false; }
    });
  }

  toggleEndpointForm(ep?: any): void {
    if (!this.expandedCollectionId) return;
    const ref = this.dialog.open(EndpointEditDialogComponent, {
      width: '700px',
      panelClass: 'endpoint-edit-dialog',
      data: {
        endpoint: ep || {},
        projectId: this.projectId,
        collectionId: this.expandedCollectionId,
        mode: ep ? 'edit' : 'add'
      }
    });
    ref.afterClosed().subscribe((result: any) => {
      if (!result || !this.expandedCollectionId) return;
      const obs = ep?.id
        ? this.projectService.updateEndpoint(this.projectId, this.expandedCollectionId, ep.id, result)
        : this.projectService.addEndpoint(this.projectId, this.expandedCollectionId, result);
      obs.subscribe({
        next: () => {
          this.snackBar.open(ep?.id ? 'Endpoint updated' : 'Endpoint added', 'Close', { duration: 2000 });
          this.loadEndpoints(this.expandedCollectionId!);
          this.loadProject();
        },
        error: () => this.snackBar.open('Failed', 'Close', { duration: 3000 })
      });
    });
  }

  cancelEndpointForm(): void { this.showEndpointForm = false; this.editingEndpointId = null; }

  saveEndpoint(): void {
    if (this.endpointForm.invalid || !this.expandedCollectionId) return;
    const data = this.endpointForm.value;
    const obs = this.editingEndpointId
      ? this.projectService.updateEndpoint(this.projectId, this.expandedCollectionId, this.editingEndpointId, data)
      : this.projectService.addEndpoint(this.projectId, this.expandedCollectionId, data);
    obs.subscribe({
      next: () => {
        this.showEndpointForm = false;
        this.editingEndpointId = null;
        this.loadEndpoints(this.expandedCollectionId!);
        this.loadProject();
      },
      error: () => this.snackBar.open('Failed', 'Close', { duration: 3000 })
    });
  }

  deleteEndpoint(ep: any): void {
    if (!this.expandedCollectionId || !confirm(`Delete endpoint "${ep.name}"?`)) return;
    this.projectService.deleteEndpoint(this.projectId, this.expandedCollectionId, ep.id).subscribe({
      next: () => { this.loadEndpoints(this.expandedCollectionId!); this.loadProject(); },
      error: () => this.snackBar.open('Failed', 'Close', { duration: 3000 })
    });
  }

  getMethodColor(method: string): string {
    const colors: Record<string, string> = { GET: '#4caf50', POST: '#ff9800', PUT: '#2196f3', PATCH: '#9c27b0', DELETE: '#f44336' };
    return colors[method] || '#666';
  }

  // --- Import ---
  toggleImportForm(): void { this.showImportForm = !this.showImportForm; this.importContent = ''; }
  importCollection(): void {
    if (!this.importContent.trim()) return;
    this.isImporting = true;
    this.projectService.importCollection(this.projectId, this.importContent).subscribe({
      next: (res) => {
        this.snackBar.open(res.message || 'Imported!', 'Close', { duration: 3000 });
        this.showImportForm = false;
        this.importContent = '';
        this.isImporting = false;
        this.loadProject();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Import failed', 'Close', { duration: 3000 });
        this.isImporting = false;
      }
    });
  }

  // --- Runner ---
  openRunner(ep: any): void {
    this.showEndpointForm = false;
    this.editingEndpointId = null;
    this.runnerEndpoint = ep;
    this.runnerCollectionId = this.expandedCollectionId;
  }
  closeRunner(): void { this.runnerEndpoint = null; this.runnerCollectionId = null; }
  onEndpointSaved(): void {
    this.snackBar.open('Endpoint saved', 'Close', { duration: 2000 });
    if (this.expandedCollectionId) this.loadEndpoints(this.expandedCollectionId);
    this.loadProject();
  }
}
