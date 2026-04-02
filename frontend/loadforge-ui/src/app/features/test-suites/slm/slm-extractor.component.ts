import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TestSuiteService } from '../../../core/services/test-suite.service';
import { ExtractRulesResponse } from '../../../core/models';

@Component({
  selector: 'app-slm-extractor',
  templateUrl: './slm-extractor.component.html',
  styleUrls: ['./slm-extractor.component.scss']
})
export class SlmExtractorComponent {
  projectId = '';
  collectionId = '';
  inputText = '';
  extracting = false;
  result: ExtractRulesResponse | null = null;
  error = '';

  exampleTexts = [
    {
      label: 'PR Description: Date Validation',
      text: `Added validation for booking endpoints:
- End date must be after start date
- Booking duration cannot exceed 30 days
- Past dates are not allowed for new bookings
Impacted: POST /api/bookings, PUT /api/bookings/{id}`
    },
    {
      label: 'Task: Role-Based Access',
      text: `Implement role-based access control:
- Only Admin and Manager roles can delete orders
- Only Admin can modify pricing
- All authenticated users can view orders
Endpoints: DELETE /api/orders/{id}, PUT /api/products/{id}/price, GET /api/orders`
    },
    {
      label: 'Requirement: Conditional Fields',
      text: `Payment processing requirements:
- When payment_method is "credit_card", card_number and expiry_date are required
- When payment_method is "bank_transfer", account_number and routing_number are required
- Amount must be between 1 and 10000
- Currency must be a valid ISO 4217 code
Endpoint: POST /api/payments`
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testSuiteService: TestSuiteService
  ) {
    this.collectionId = this.route.snapshot.paramMap.get('collectionId') || '';
    this.projectId = this.route.snapshot.queryParamMap.get('projectId') || '';
  }

  extractRules(): void {
    if (!this.inputText.trim()) {
      this.error = 'Please enter text to extract rules from';
      return;
    }

    this.extracting = true;
    this.error = '';
    this.result = null;

    this.testSuiteService.extractRules(this.projectId, this.collectionId, {
      inputText: this.inputText
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.result = res.data;
        } else {
          this.error = res.message || 'Extraction failed';
        }
        this.extracting = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'SLM extraction failed. Is the SLM service enabled and running?';
        this.extracting = false;
      }
    });
  }

  useExample(text: string): void {
    this.inputText = text;
  }

  viewTestCases(): void {
    this.router.navigate(['test-suites', this.collectionId, 'tests'], {
      queryParams: { projectId: this.projectId, needsReview: true }
    });
  }

  getRuleTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      comparison: '⚖️',
      conditional_required: '🔗',
      role_restriction: '🔐',
      state_restriction: '🔄',
      numeric_limit: '🔢',
      format_validation: '📝'
    };
    return icons[type] || '📌';
  }

  getRuleTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      comparison: 'Comparison',
      conditional_required: 'Conditional Required',
      role_restriction: 'Role Restriction',
      state_restriction: 'State Restriction',
      numeric_limit: 'Numeric Limit',
      format_validation: 'Format Validation'
    };
    return labels[type] || type;
  }
}

