import { Component } from '@angular/core';

@Component({
  selector: 'app-scenarios-list',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Scenarios</h1>
        <button mat-raised-button color="primary"><mat-icon>add</mat-icon> New Scenario</button>
      </div>
      <div class="empty-state">
        <mat-icon>science</mat-icon>
        <h2>Select a project first</h2>
        <p>Navigate to a project to view and create scenarios.</p>
        <button mat-raised-button color="primary" routerLink="/projects">Go to Projects</button>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; h1 { font-size: 28px; font-weight: 300; } }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 64px; color: #999;
      mat-icon { font-size: 64px; width: 64px; height: 64px; } h2 { margin: 16px 0 8px; } }
  `]
})
export class ScenariosListComponent { }

