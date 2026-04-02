import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { LayoutModule } from '../../layout/layout.module';
import { LayoutComponent } from '../../layout/layout.component';
import { ScenariosListComponent } from './list/scenarios-list.component';
import { ScenarioDetailComponent } from './detail/scenario-detail.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: ScenariosListComponent },
      { path: ':id', component: ScenarioDetailComponent }
    ]
  }
];

@NgModule({
  declarations: [ScenariosListComponent, ScenarioDetailComponent],
  imports: [SharedModule, LayoutModule, RouterModule.forChild(routes)]
})
export class ScenariosModule { }

