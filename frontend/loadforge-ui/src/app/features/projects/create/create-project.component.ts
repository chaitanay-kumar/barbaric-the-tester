import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectService } from '../../../core/services/project.service';

@Component({
  selector: 'app-create-project',
  templateUrl: './create-project.component.html',
  styleUrls: ['./create-project.component.scss']
})
export class CreateProjectComponent implements OnInit {
  projectForm!: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      description: [''],
      defaultBaseUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]]
    });

    // Auto-generate slug from name
    this.projectForm.get('name')?.valueChanges.subscribe(value => {
      if (value) {
        const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        this.projectForm.get('slug')?.setValue(slug, { emitEvent: false });
      }
    });
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.projectService.createProject(this.projectForm.value).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.snackBar.open('Project created!', 'Close', { duration: 3000 });
          this.router.navigate(['/projects', res.data.id]);
        } else {
          this.snackBar.open(res.message || 'Failed to create project', 'Close', { duration: 3000 });
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to create project', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/projects']);
  }
}

