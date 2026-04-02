import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-run-detail',
  template: `
    <div class="page">
      <div class="page-header">
        <button mat-icon-button routerLink="/runs"><mat-icon>arrow_back</mat-icon></button>
        <h1>Run Detail</h1>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Run detail view with live metrics - coming soon.</p>
          <p>Run ID: {{ runId }}</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; h1 { font-size: 28px; font-weight: 300; } }
  `]
})
export class RunDetailComponent {
  runId: string;
  constructor(private route: ActivatedRoute) {
    this.runId = this.route.snapshot.paramMap.get('id') || '';
  }
}

