import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TestSuiteService } from '../../../core/services/test-suite.service';
import { GeneratedTestCase, CoverageSummary } from '../../../core/models';

@Component({
  selector: 'app-test-case-list',
  templateUrl: './test-case-list.component.html',
  styleUrls: ['./test-case-list.component.scss']
})
export class TestCaseListComponent implements OnInit {
  projectId = '';
  collectionId = '';
  testCases: GeneratedTestCase[] = [];
  coverage: CoverageSummary | null = null;
  totalCount = 0;
  page = 1;
  pageSize = 50;
  loading = true;

  // Filters
  severityFilter = '';
  categoryFilter = '';
  reviewFilter: boolean | undefined;

  categories = ['Smoke', 'Validation', 'Boundary', 'Negative', 'Contract', 'StateAwareCRUD'];
  severities = ['P0', 'P1', 'P2'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testSuiteService: TestSuiteService
  ) {}

  ngOnInit(): void {
    this.collectionId = this.route.snapshot.paramMap.get('collectionId') || '';
    this.projectId = this.route.snapshot.queryParamMap.get('projectId') || '';
    this.loadTests();
    this.loadCoverage();
  }

  loadTests(): void {
    this.loading = true;
    this.testSuiteService.getTestCases(this.projectId, this.collectionId, {
      severity: this.severityFilter || undefined,
      category: this.categoryFilter || undefined,
      needsReview: this.reviewFilter,
      page: this.page,
      pageSize: this.pageSize
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.testCases = res.data.items;
          this.totalCount = res.data.totalCount;
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadCoverage(): void {
    this.testSuiteService.getCoverageSummary(this.projectId, this.collectionId).subscribe({
      next: (res) => {
        if (res.success && res.data) this.coverage = res.data;
      }
    });
  }

  applyFilter(): void {
    this.page = 1;
    this.loadTests();
  }

  clearFilters(): void {
    this.severityFilter = '';
    this.categoryFilter = '';
    this.reviewFilter = undefined;
    this.page = 1;
    this.loadTests();
  }

  viewDetail(testId: string): void {
    this.router.navigate(['test-suites', this.collectionId, 'tests', testId], {
      queryParams: { projectId: this.projectId }
    });
  }

  nextPage(): void {
    this.page++;
    this.loadTests();
  }

  prevPage(): void {
    if (this.page > 1) { this.page--; this.loadTests(); }
  }

  getMethodClass(method: string): string {
    return method.toLowerCase();
  }

  getSeverityClass(severity: string): string {
    return severity.toLowerCase();
  }
}

