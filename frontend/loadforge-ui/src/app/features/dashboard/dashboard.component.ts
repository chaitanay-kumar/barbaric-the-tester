import { Component, OnInit } from '@angular/core';
import { ProjectService } from '../../core/services/project.service';
import { RunService } from '../../core/services/run.service';
import { AuthService } from '../../core/services/auth.service';
import { Project, TestRun, User } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  projects: Project[] = [];
  recentRuns: TestRun[] = [];
  isLoading = true;

  stats = {
    totalProjects: 0,
    totalRuns: 0,
    passRate: 0,
    activeRuns: 0
  };

  constructor(
    private authService: AuthService,
    private projectService: ProjectService,
    private runService: RunService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.projectService.getProjects(1, 5).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.projects = res.data.items;
          this.stats.totalProjects = res.data.totalCount;
        }
      }
    });

    this.runService.getRuns(1, 10).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.recentRuns = res.data.items;
          this.stats.totalRuns = res.data.totalCount;
          this.stats.activeRuns = this.recentRuns.filter(r => r.status === 'Running').length;
          const completed = this.recentRuns.filter(r => r.status === 'Completed');
          const passed = completed.filter(r => r.result === 'Pass');
          this.stats.passRate = completed.length > 0 ? Math.round((passed.length / completed.length) * 100) : 0;
        }
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      'Running': 'accent', 'Completed': 'primary', 'Failed': 'warn',
      'Pending': '', 'Cancelled': ''
    };
    return map[status] || '';
  }

  getResultIcon(result: string): string {
    return result === 'Pass' ? 'check_circle' : result === 'Fail' ? 'cancel' : 'error';
  }
}

