import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h2 class="brand-title">StockPro <span>Dashboard</span></h2>
        <p class="subtitle">Log in to view live stocks</p>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input 
              id="email" 
              type="email" 
              formControlName="email" 
              placeholder="Enter your email" 
              autocomplete="email"
              [class.invalid]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
            >
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              id="password" 
              type="password" 
              formControlName="password" 
              placeholder="Enter your password"
              autocomplete="current-password"
              [class.invalid]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
            >
          </div>
          
          <div class="error-message" *ngIf="errorMessage">{{ errorMessage }}</div>
          
          <button type="submit" [disabled]="loginForm.invalid || isLoading">
            {{ isLoading ? 'Authenticating...' : 'Sign In' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      font-family: 'Inter', sans-serif;
    }
    
    .login-card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 40px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    
    .brand-title {
      color: #fff;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px 0;
      text-align: center;
    }
    
    .brand-title span {
      color: #8b5cf6;
    }
    
    .subtitle {
      color: #94a3b8;
      text-align: center;
      margin-bottom: 32px;
      font-size: 14px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      color: #cbd5e1;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
    }
    
    input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #fff;
      font-size: 15px;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    
    input:focus {
      outline: none;
      border-color: #8b5cf6;
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
    }
    
    input.invalid {
      border-color: #ef4444;
    }
    
    .error-message {
      color: #f87171;
      font-size: 14px;
      margin-bottom: 16px;
      text-align: center;
      background: rgba(239, 68, 68, 0.1);
      padding: 10px;
      border-radius: 8px;
    }
    
    button {
      width: 100%;
      padding: 14px;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.1s ease;
    }
    
    button:hover:not([disabled]) {
      background: #7c3aed;
      transform: translateY(-1px);
    }
    
    button:active:not([disabled]) {
      transform: translateY(1px);
    }
    
    button[disabled] {
      opacity: 0.7;
      cursor: not-allowed;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error || 'Authentication failed. Please check credentials.';
      }
    });
  }
}
