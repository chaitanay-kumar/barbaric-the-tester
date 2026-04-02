import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { LayoutModule } from '../../layout/layout.module';
import { LayoutComponent } from '../../layout/layout.component';
import { ProjectsListComponent } from './list/projects-list.component';
import { ProjectDetailComponent } from './detail/project-detail.component';
import { CreateProjectComponent } from './create/create-project.component';
import { EndpointRunnerComponent } from './endpoint-runner/endpoint-runner.component';
import { EndpointEditDialogComponent } from './endpoint-edit-dialog/endpoint-edit-dialog.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: ProjectsListComponent },
      { path: 'new', component: CreateProjectComponent },
      { path: ':id', component: ProjectDetailComponent }
    ]
  }
];

@NgModule({
  declarations: [ProjectsListComponent, ProjectDetailComponent, CreateProjectComponent, EndpointRunnerComponent, EndpointEditDialogComponent],
  imports: [SharedModule, LayoutModule, RouterModule.forChild(routes)]
})
export class ProjectsModule { }
