import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      organizationName: ['', [Validators.required]],
      organizationSlug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]]
    });

    // Auto-generate slug from organization name
    this.registerForm.get('organizationName')?.valueChanges.subscribe(value => {
      if (value) {
        const slug = value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        this.registerForm.get('organizationSlug')?.setValue(slug);
      }
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.authService.register(this.registerForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Registration successful!', 'Close', { duration: 3000 });
          this.router.navigate(['/dashboard']);
        } else {
          this.snackBar.open(response.message || 'Registration failed', 'Close', { duration: 3000 });
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.snackBar.open(error.error?.message || 'Registration failed', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }
}

