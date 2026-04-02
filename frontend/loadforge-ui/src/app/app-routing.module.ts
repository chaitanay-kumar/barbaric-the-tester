import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'projects',
    loadChildren: () => import('./features/projects/projects.module').then(m => m.ProjectsModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'scenarios',
    loadChildren: () => import('./features/scenarios/scenarios.module').then(m => m.ScenariosModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'runs',
    loadChildren: () => import('./features/runs/runs.module').then(m => m.RunsModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'test-suites',
    loadChildren: () => import('./features/test-suites/test-suites.module').then(m => m.TestSuitesModule),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

