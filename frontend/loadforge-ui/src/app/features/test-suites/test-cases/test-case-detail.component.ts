import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TestSuiteService } from '../../../core/services/test-suite.service';
import { GeneratedTestCaseDetail } from '../../../core/models';

@Component({
  selector: 'app-test-case-detail',
  templateUrl: './test-case-detail.component.html',
  styleUrls: ['./test-case-detail.component.scss']
})
export class TestCaseDetailComponent implements OnInit {
  projectId = '';
  collectionId = '';
  testId = '';
  test: GeneratedTestCaseDetail | null = null;
  loading = true;
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private testSuiteService: TestSuiteService
  ) {}

  ngOnInit(): void {
    this.collectionId = this.route.snapshot.paramMap.get('collectionId') || '';
    this.testId = this.route.snapshot.paramMap.get('testId') || '';
    this.projectId = this.route.snapshot.queryParamMap.get('projectId') || '';
    this.loadTest();
  }

  loadTest(): void {
    this.loading = true;
    this.testSuiteService.getTestCaseDetail(this.projectId, this.collectionId, this.testId).subscribe({
      next: (res) => {
        if (res.success && res.data) this.test = res.data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  save(): void {
    if (!this.test) return;
    this.saving = true;
    this.testSuiteService.updateTestCase(this.projectId, this.collectionId, this.testId, {
      name: this.test.name,
      severity: this.test.severity,
      payloadJson: this.test.payloadJson,
      assertionsJson: this.test.assertionsJson,
      needsReview: this.test.needsReview,
      isActive: this.test.isActive
    }).subscribe({
      next: () => this.saving = false,
      error: () => this.saving = false
    });
  }

  formatJson(json: string | undefined | null): string {
    if (!json) return '';
    try { return JSON.stringify(JSON.parse(json), null, 2); }
    catch { return json; }
  }
}

