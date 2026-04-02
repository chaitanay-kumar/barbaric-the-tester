import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TestSuiteService } from '../../../core/services/test-suite.service';
import { GeneratedTestRunDetail, TestExecution } from '../../../core/models';
import { Subscription, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

@Component({
  selector: 'app-test-run-detail',
  templateUrl: './test-run-detail.component.html',
  styleUrls: ['./test-run-detail.component.scss']
})
export class TestRunDetailComponent implements OnInit, OnDestroy {
  projectId = '';
  collectionId = '';
  runId = '';
  run: GeneratedTestRunDetail | null = null;
  loading = true;
  selectedExecution: TestExecution | null = null;
  isRunning = false;
  pollSub: Subscription | null = null;
  elapsedSeconds = 0;
  elapsedTimer: any = null;
  startTime = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testSuiteService: TestSuiteService
  ) {}

  ngOnInit(): void {
    this.collectionId = this.route.snapshot.paramMap.get('collectionId') || '';
    this.runId = this.route.snapshot.paramMap.get('runId') || '';
    this.projectId = this.route.snapshot.queryParamMap.get('projectId') || '';
    this.loadRun();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadRun(): void {
    this.loading = true;
    this.testSuiteService.getTestRunDetail(this.projectId, this.collectionId, this.runId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.run = res.data;
          if (res.data.status === 'Running') {
            this.isRunning = true;
            this.startTime = Date.now();
            this.startElapsedTimer();
            this.startPolling();
          }
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  startPolling(): void {
    this.pollSub = interval(1000).pipe(
      switchMap(() =>
        this.testSuiteService.getTestRunDetail(this.projectId, this.collectionId, this.runId)
      ),
      takeWhile(res => {
        if (res.success && res.data) {
          this.run = res.data;
          return res.data.status === 'Running';
        }
        return true;
      }, true)
    ).subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.status !== 'Running') {
          this.isRunning = false;
          this.stopPolling();
        }
      },
      error: () => {
        this.isRunning = false;
        this.stopPolling();
      }
    });
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
      this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    }, 1000);
  }

  get completedCount(): number {
    return this.run?.executions?.length || 0;
  }

  get progressPercent(): number {
    if (!this.run || !this.run.totalTests) return 0;
    return Math.round((this.completedCount / this.run.totalTests) * 100);
  }

  selectExecution(exec: TestExecution): void {
    this.selectedExecution = this.selectedExecution?.id === exec.id ? null : exec;
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  get passedExecutions(): TestExecution[] {
    return this.run?.executions.filter(e => e.status === 'Passed') || [];
  }

  get failedExecutions(): TestExecution[] {
    return this.run?.executions.filter(e => e.status === 'Failed') || [];
  }

  get recentExecutions(): TestExecution[] {
    if (!this.run?.executions) return [];
    // Get last 5 completed executions, sorted by most recent first
    return [...this.run.executions].reverse().slice(0, 5);
  }

  get currentlyRunningTest(): string | null {
    if (!this.isRunning || !this.run) return null;
    const completed = this.run.executions?.length || 0;
    const total = this.run.totalTests || 0;
    if (completed < total) {
      return `Test ${completed + 1} of ${total}`;
    }
    return null;
  }

  get skippedExecutions(): TestExecution[] {
    return this.run?.executions.filter(e => e.status === 'Skipped') || [];
  }

  formatJson(json: string | undefined | null): string {
    if (!json) return '';
    try { return JSON.stringify(JSON.parse(json), null, 2); }
    catch { return json; }
  }

  goBack(): void {
    this.router.navigate(['test-suites', this.collectionId, 'runs'], {
      queryParams: { projectId: this.projectId }
    });
  }

  downloadReport(format: 'html' | 'junit' | 'json'): void {
    this.testSuiteService.downloadReport(this.projectId, this.collectionId, this.runId, format)
      .subscribe({
        next: (blob) => {
          const ext = format === 'junit' ? 'xml' : format;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `test-report-${this.runId.substring(0, 8)}.${ext}`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      });
  }

  cancelRun(): void {
    if (!confirm('Cancel this test run?')) return;

    this.testSuiteService.cancelTestRun(this.projectId, this.collectionId, this.runId).subscribe({
      next: (res) => {
        if (res.success) {
          this.isRunning = false;
          this.stopPolling();
          this.loadRun();
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to cancel run');
      }
    });
  }
}
