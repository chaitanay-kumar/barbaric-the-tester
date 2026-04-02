import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { LayoutModule } from '../../layout/layout.module';
import { LayoutComponent } from '../../layout/layout.component';
import { RunsListComponent } from './list/runs-list.component';
import { RunDetailComponent } from './detail/run-detail.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: RunsListComponent },
      { path: ':id', component: RunDetailComponent }
    ]
  }
];

@NgModule({
  declarations: [RunsListComponent, RunDetailComponent],
  imports: [SharedModule, LayoutModule, RouterModule.forChild(routes)]
})
export class RunsModule { }

