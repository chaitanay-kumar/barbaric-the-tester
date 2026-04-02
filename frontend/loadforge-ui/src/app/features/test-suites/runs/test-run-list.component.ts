import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TestSuiteService } from '../../../core/services/test-suite.service';
import { GeneratedTestRun, ExecuteTestSuiteRequest, Environment } from '../../../core/models';
import { ProjectService } from '../../../core/services/project.service';
import { Subscription, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

@Component({
  selector: 'app-test-run-list',
  templateUrl: './test-run-list.component.html',
  styleUrls: ['./test-run-list.component.scss']
})
export class TestRunListComponent implements OnInit, OnDestroy {
  projectId = '';
  collectionId = '';
  runs: GeneratedTestRun[] = [];
  environments: Environment[] = [];
  totalCount = 0;
  page = 1;
  loading = true;
  executing = false;

  // Execute form
  showExecuteForm = false;
  selectedEnvironmentId = '';
  authToken = '';
  runDescription = '';
  severityFilter = '';
  categoryFilter = '';

  // Progress tracking
  activeRunId = '';
  activeRunStatus = '';
  pollSub: Subscription | null = null;
  executionStartTime: number = 0;
  elapsedSeconds = 0;
  elapsedTimer: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testSuiteService: TestSuiteService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.collectionId = this.route.snapshot.paramMap.get('collectionId') || '';
    this.projectId = this.route.snapshot.queryParamMap.get('projectId') || '';
    this.loadRuns();
    this.loadEnvironments();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadRuns(): void {
    this.loading = true;
    this.testSuiteService.getTestRuns(this.projectId, this.collectionId, this.page).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.runs = res.data.items;
          this.totalCount = res.data.totalCount;
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadEnvironments(): void {
    this.projectService.getProject(this.projectId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.environments = res.data.environments;
          if (this.environments.length > 0) {
            this.selectedEnvironmentId = this.environments[0].id;
          }
        }
      }
    });
  }

  executeTests(): void {
    if (!this.selectedEnvironmentId) return;

    this.executing = true;
    this.activeRunStatus = 'Starting...';
    const request: ExecuteTestSuiteRequest = {
      environmentId: this.selectedEnvironmentId,
      authToken: this.authToken || undefined,
      description: this.runDescription || undefined,
      severityFilter: this.severityFilter || undefined,
      categoryFilter: this.categoryFilter || undefined
    };

    this.testSuiteService.executeTestSuite(this.projectId, this.collectionId, request).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.showExecuteForm = false;
          this.executing = false;
          // Navigate immediately to the run detail page for real-time results
          this.router.navigate(['test-suites', this.collectionId, 'runs', res.data.runId], {
            queryParams: { projectId: this.projectId }
          });
        } else {
          this.executing = false;
        }
      },
      error: (err) => {
        this.executing = false;
        alert(err.error?.message || 'Execution failed');
      }
    });
  }

  startPolling(): void {
    this.pollSub = interval(2000).pipe(
      switchMap(() =>
        this.testSuiteService.getTestRunDetail(this.projectId, this.collectionId, this.activeRunId)
      ),
      takeWhile(res => {
        if (res.success && res.data) {
          const status = res.data.status;
          this.activeRunStatus = status;
          if (status === 'Passed' || status === 'Failed' || status === 'Cancelled') {
            return false; // stop polling
          }
        }
        return true;
      }, true) // inclusive — emit the final value
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const status = res.data.status;
          if (status === 'Passed' || status === 'Failed' || status === 'Cancelled') {
            this.onExecutionComplete();
          }
        }
      },
      error: () => {
        this.onExecutionComplete();
      }
    });
  }

  cancelRun(runId: string): void {
    if (!confirm('Cancel this test run?')) return;

    this.testSuiteService.cancelTestRun(this.projectId, this.collectionId, runId).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadRuns();
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to cancel run');
      }
    });
  }

  onExecutionComplete(): void {
    this.stopPolling();
    this.executing = false;
    this.loadRuns();

    // Navigate to the completed run detail
    if (this.activeRunId) {
      this.router.navigate(['test-suites', this.collectionId, 'runs', this.activeRunId], {
        queryParams: { projectId: this.projectId }
      });
    }
  }

  stopPolling(): void {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = null;
    }
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
  }

  startElapsedTimer(): void {
    this.elapsedSeconds = 0;
    this.elapsedTimer = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.executionStartTime) / 1000);
    }, 1000);
  }

  viewDetail(runId: string): void {
    this.router.navigate(['test-suites', this.collectionId, 'runs', runId], {
      queryParams: { projectId: this.projectId }
    });
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }
}
