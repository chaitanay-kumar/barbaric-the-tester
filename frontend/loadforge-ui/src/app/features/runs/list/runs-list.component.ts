import { Component, OnInit } from '@angular/core';
import { RunService } from '../../../core/services/run.service';
import { TestRun } from '../../../core/models';

@Component({
  selector: 'app-runs-list',
  templateUrl: './runs-list.component.html',
  styleUrls: ['./runs-list.component.scss']
})
export class RunsListComponent implements OnInit {
  runs: TestRun[] = [];
  isLoading = true;
  displayedColumns = ['runNumber', 'scenario', 'environment', 'status', 'result', 'startedAt', 'duration', 'actions'];

  constructor(private runService: RunService) {}

  ngOnInit(): void {
    this.loadRuns();
  }

  loadRuns(): void {
    this.runService.getRuns(1, 50).subscribe({
      next: (res) => {
        if (res.success && res.data) { this.runs = res.data.items; }
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = { 'Running': 'accent', 'Completed': 'primary', 'Failed': 'warn' };
    return map[status] || '';
  }
}

