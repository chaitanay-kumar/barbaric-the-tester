import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-scenario-detail',
  template: `
    <div class="page">
      <div class="page-header">
        <button mat-icon-button routerLink="/scenarios"><mat-icon>arrow_back</mat-icon></button>
        <h1>Scenario Detail</h1>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Scenario detail view - coming soon.</p>
          <p>Scenario ID: {{ scenarioId }}</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; h1 { font-size: 28px; font-weight: 300; } }
  `]
})
export class ScenarioDetailComponent {
  scenarioId: string;
  constructor(private route: ActivatedRoute) {
    this.scenarioId = this.route.snapshot.paramMap.get('id') || '';
  }
}

