import { Component, OnDestroy } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationError, Event as RouterEvent } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css']
})
export class SignInComponent implements OnDestroy {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  isSubmitting: boolean = false;

  private navigationSubscription: Subscription;

  constructor(private http: HttpClient, private router: Router) {
    this.navigationSubscription = this.router.events.subscribe((event: RouterEvent) => {
      if (event instanceof NavigationStart) {
        this.isSubmitting = true; 
      } else if (event instanceof NavigationEnd || event instanceof NavigationError) {
        this.isSubmitting = false; 
      }
    });
  }

  onSignIn(): void {
    this.errorMessage = '';

    const emailTrimmed = this.email.trim();
    const passwordTrimmed = this.password.trim();

    if (!emailTrimmed || !passwordTrimmed) {
      this.errorMessage = 'Email and password are required.';
      return;
    }

    const apiUrl = `https://www.nomad.org.in/rkt/api/rkt/CheckUser?userid=${encodeURIComponent(emailTrimmed)}&password=${encodeURIComponent(passwordTrimmed)}`;

    this.http.get<any>(apiUrl).subscribe({
      next: (res) => {
        console.log('Login response:', res); // ✅ Debug log

        if (res?.status === 200 && Array.isArray(res.Data) && res.Data.length > 0) {
          const user = res.Data[0];

          localStorage.setItem('userId', user.user_id);
          localStorage.setItem('userRole', (user.user_type?.toLowerCase()) || 'user');
          localStorage.setItem('userName', user.name || 'User');

          this.router.navigate(['/menu']);
        } else {
          this.errorMessage = 'Invalid credentials.';
        }
      },
      error: (err) => {
        console.error('Login failed:', err);
        this.errorMessage = 'Something went wrong. Please try again.';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.navigationSubscription) {
      this.navigationSubscription.unsubscribe();
    }
  }
}
