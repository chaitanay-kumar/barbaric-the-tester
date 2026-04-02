import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { TestSuiteService } from '../../../core/services/test-suite.service';
import { ProjectDetail, ApiCollection, CoverageSummary } from '../../../core/models';

@Component({
  selector: 'app-test-suite-dashboard',
  templateUrl: './test-suite-dashboard.component.html',
  styleUrls: ['./test-suite-dashboard.component.scss']
})
export class TestSuiteDashboardComponent implements OnInit {
  projects: ProjectDetail[] = [];
  coverageSummaries: Map<string, CoverageSummary> = new Map();
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private testSuiteService: TestSuiteService
  ) {}

  ngOnInit(): void {
    this.loadAllProjects();
  }

  loadAllProjects(): void {
    this.loading = true;
    this.projectService.getProjects(1, 50).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const projectList = res.data.items;
          // Load detail for each project to get collections
          let loaded = 0;
          if (projectList.length === 0) {
            this.loading = false;
            return;
          }
          projectList.forEach(p => {
            this.projectService.getProject(p.id).subscribe({
              next: (detailRes) => {
                loaded++;
                if (detailRes.success && detailRes.data) {
                  this.projects.push(detailRes.data);
                  // Load coverage for each collection
                  (detailRes.data.collections || []).forEach(col => {
                    this.testSuiteService.getCoverageSummary(p.id, col.id).subscribe({
                      next: (covRes) => {
                        if (covRes.success && covRes.data) {
                          this.coverageSummaries.set(col.id, covRes.data);
                        }
                      }
                    });
                  });
                }
                if (loaded >= projectList.length) {
                  this.loading = false;
                }
              },
              error: () => {
                loaded++;
                if (loaded >= projectList.length) {
                  this.loading = false;
                }
              }
            });
          });
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.error = 'Failed to load projects';
        this.loading = false;
      }
    });
  }

  getCollections(project: ProjectDetail): ApiCollection[] {
    return project.collections || [];
  }

  navigateToGenerator(projectId: string): void {
    this.router.navigate(['test-suites', 'generate'], {
      queryParams: { projectId }
    });
  }

  navigateToTestCases(projectId: string, collectionId: string): void {
    this.router.navigate(['test-suites', collectionId, 'tests'], {
      queryParams: { projectId }
    });
  }

  navigateToRuns(projectId: string, collectionId: string): void {
    this.router.navigate(['test-suites', collectionId, 'runs'], {
      queryParams: { projectId }
    });
  }

  navigateToSlm(projectId: string, collectionId: string): void {
    this.router.navigate(['test-suites', collectionId, 'extract-rules'], {
      queryParams: { projectId }
    });
  }

  getCoverage(collectionId: string): CoverageSummary | undefined {
    return this.coverageSummaries.get(collectionId);
  }
}
