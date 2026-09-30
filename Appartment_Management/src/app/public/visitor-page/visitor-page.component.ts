import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-visitor-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './visitor-page.component.html',
  styleUrl: './visitor-page.component.css'
})
export class VisitorPageComponent {

  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService, { optional: true });

  private readonly API_ADD_VISITOR =
    'https://www.nomad.org.in/rkt/api/rkt/AddVisitor';

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  visitorForm = this.fb.nonNullable.group({

    name: [
      '',
      [
        Validators.maxLength(100)
      ]
    ],

    flat_no: [
      '',
      [
        Validators.required
      ]
    ],

    purpose: [
      '',
      [
        Validators.maxLength(150)
      ]
    ],

    remarks: [
      '',
      [
        Validators.maxLength(500)
      ]
    ],

    mobile_no: [
      '',
      [
        Validators.maxLength(15)
      ]
    ]

  });

  get name() {
    return this.visitorForm.controls.name;
  }

  get flatNo() {
    return this.visitorForm.controls.flat_no;
  }

  get purpose() {
    return this.visitorForm.controls.purpose;
  }

  get remarks() {
    return this.visitorForm.controls.remarks;
  }

  get mobileNumber() {
    return this.visitorForm.controls.mobile_no;
  }

  submitVisitor(): void {

    this.successMessage = '';
    this.errorMessage = '';

    if (this.visitorForm.invalid) {
      this.visitorForm.markAllAsTouched();
      this.toastr?.warning('Please select a flat number.', 'Validation');
      return;
    }

    this.isSubmitting = true;

    const payload = this.visitorForm.getRawValue();

    this.http.post(
      this.API_ADD_VISITOR,
      payload
    ).subscribe({

      next: (response) => {

        console.log('Visitor added successfully:', response);
        this.toastr?.success('Visitor details have been submitted successfully.', 'Success');

        this.successMessage =
          'Visitor details have been submitted successfully.';

        this.visitorForm.reset();

        this.isSubmitting = false;
      },

      error: (error) => {

        console.error('Add visitor error:', error);
        this.toastr?.error('Unable to submit visitor details. Please try again.', 'Error');

        this.errorMessage =
          'Unable to submit visitor details. Please try again.';

        this.isSubmitting = false;
      }

    });
  }
}