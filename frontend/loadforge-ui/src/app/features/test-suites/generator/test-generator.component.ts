import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TestSuiteService } from '../../../core/services/test-suite.service';
import { GenerationSummary } from '../../../core/models';

@Component({
  selector: 'app-test-generator',
  templateUrl: './test-generator.component.html',
  styleUrls: ['./test-generator.component.scss']
})
export class TestGeneratorComponent {
  projectId = '';
  openApiContent = '';
  fileName = '';

  // Generation options
  seed = 42;
  testDataPrefix = 'loadforge_test_';
  generateSmoke = true;
  generateValidation = true;
  generateBoundary = true;
  generateNegative = true;
  generateContract = true;
  generateCrud = true;

  // State
  generating = false;
  importing = false;
  result: GenerationSummary | null = null;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testSuiteService: TestSuiteService
  ) {
    this.projectId = this.route.snapshot.queryParamMap.get('projectId') || '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.fileName = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        this.openApiContent = reader.result as string;
      };
      reader.readAsText(file);
    }
  }

  onPasteSpec(): void {
    // Content is bound via ngModel
    this.fileName = 'pasted-spec.json';
  }

  generate(): void {
    if (!this.openApiContent) {
      this.error = 'Please upload or paste an OpenAPI specification';
      return;
    }

    this.generating = true;
    this.error = '';
    this.result = null;

    this.testSuiteService.generateTestSuite(this.projectId, {
      openApiContent: this.openApiContent,
      seed: this.seed,
      testDataPrefix: this.testDataPrefix,
      generateSmoke: this.generateSmoke,
      generateValidation: this.generateValidation,
      generateBoundary: this.generateBoundary,
      generateNegative: this.generateNegative,
      generateContract: this.generateContract,
      generateCrud: this.generateCrud
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.result = res.data;
        } else {
          this.error = res.message || 'Generation failed';
        }
        this.generating = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Generation failed. Check your OpenAPI spec.';
        this.generating = false;
      }
    });
  }

  viewTests(): void {
    if (this.result) {
      this.router.navigate(['test-suites', this.result.collectionId, 'tests'], {
        queryParams: { projectId: this.projectId }
      });
    }
  }
}

