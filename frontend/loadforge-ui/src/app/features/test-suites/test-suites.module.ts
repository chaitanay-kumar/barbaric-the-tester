import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { LayoutModule } from '../../layout/layout.module';
import { LayoutComponent } from '../../layout/layout.component';
import { TestSuiteDashboardComponent } from './dashboard/test-suite-dashboard.component';
import { TestGeneratorComponent } from './generator/test-generator.component';
import { TestCaseListComponent } from './test-cases/test-case-list.component';
import { TestCaseDetailComponent } from './test-cases/test-case-detail.component';
import { TestRunListComponent } from './runs/test-run-list.component';
import { TestRunDetailComponent } from './runs/test-run-detail.component';
import { SlmExtractorComponent } from './slm/slm-extractor.component';
import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: TestSuiteDashboardComponent },
      { path: 'generate', component: TestGeneratorComponent },
      { path: ':collectionId/extract-rules', component: SlmExtractorComponent },
      { path: ':collectionId/tests', component: TestCaseListComponent },
      { path: ':collectionId/tests/:testId', component: TestCaseDetailComponent },
      { path: ':collectionId/runs', component: TestRunListComponent },
      { path: ':collectionId/runs/:runId', component: TestRunDetailComponent }
    ]
  }
];

@NgModule({
  declarations: [
    TestSuiteDashboardComponent,
    TestGeneratorComponent,
    TestCaseListComponent,
    TestCaseDetailComponent,
    TestRunListComponent,
    TestRunDetailComponent,
    SlmExtractorComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    LayoutModule,
    RouterModule.forChild(routes)
  ]
})
export class TestSuitesModule {}
