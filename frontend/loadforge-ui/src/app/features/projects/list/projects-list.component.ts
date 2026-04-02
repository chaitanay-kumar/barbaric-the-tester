import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models';

@Component({
  selector: 'app-projects-list',
  templateUrl: './projects-list.component.html',
  styleUrls: ['./projects-list.component.scss']
})
export class ProjectsListComponent implements OnInit {
  projects: Project[] = [];
  isLoading = true;
  displayedColumns = ['name', 'description', 'scenarios', 'environments', 'updated', 'actions'];

  constructor(
    private projectService: ProjectService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoading = true;
    this.projectService.getProjects(1, 50).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.projects = res.data.items;
        }
        this.isLoading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load projects', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  deleteProject(project: Project): void {
    if (confirm(`Delete project "${project.name}"?`)) {
      this.projectService.deleteProject(project.id).subscribe({
        next: () => {
          this.snackBar.open('Project deleted', 'Close', { duration: 3000 });
          this.loadProjects();
        },
        error: () => {
          this.snackBar.open('Failed to delete project', 'Close', { duration: 3000 });
        }
      });
    }
  }
}

