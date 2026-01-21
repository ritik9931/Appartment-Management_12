import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-report-analytics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './report-analytics.component.html',
  styleUrls: ['./report-analytics.component.css'] // fixed: styleUrls (plural)
})
export class ReportAnalyticsComponent implements OnInit {
  reportForm!: FormGroup;
  total: number = 0;

  months = [
    { name: 'January', value: '01' },
    { name: 'February', value: '02' },
    { name: 'March', value: '03' },
    { name: 'April', value: '04' },
    { name: 'May', value: '05' },
    { name: 'June', value: '06' },
    { name: 'July', value: '07' },
    { name: 'August', value: '08' },
    { name: 'September', value: '09' },
    { name: 'October', value: '10' },
    { name: 'November', value: '11' },
    { name: 'December', value: '12' },
  ];

  years: number[] = [];

  categories: string[] = [
    'Monthly Maintenance',
    'Donation',
    'Repair',
    'Utility',
    'Other'
  ];

  rows: Array<{
    date: string | Date;
    type: 'Income' | 'Expenditure';
    category: string;
    description: string;
    amount: number;
  }> = [];

  filteredRows: typeof this.rows = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.years = Array.from({ length: 10 }, (_, i) => currentYear - i);

    this.reportForm = this.fb.group({
      month: [''],
      year: [''],
      type: ['all'], // 'all' | 'Income' | 'Expenditure'
      category: [''],
      fromDate: [''],
      toDate: ['']
    });

    this.filteredRows = [...this.rows]; // initialize
  }

  generateReport(): void {
    if (this.reportForm.valid) {
      const { month, year } = this.reportForm.value;
      console.log(`Generating report for: ${month}-${year}`);
      // API call here
    }
  }

  applyFilters() {
    const { type, category, fromDate, toDate } = this.reportForm.value;

    this.filteredRows = this.rows.filter(r => {
      let ok = true;
      if (type && type !== 'all') ok = ok && r.type === type;
      if (category) ok = ok && r.category === category;
      if (fromDate) ok = ok && new Date(r.date) >= new Date(fromDate);
      if (toDate) ok = ok && new Date(r.date) <= new Date(toDate);
      return ok;
    });
  }

  resetFilters() {
    this.reportForm.reset({
      month: '',
      year: '',
      type: 'all',
      category: '',
      fromDate: '',
      toDate: ''
    });
    this.filteredRows = [...this.rows];
  }

  exportExcel() {
    console.log('Export to Excel', this.filteredRows);
  }

  exportPdf() {
    console.log('Export to PDF', this.filteredRows);
  }
}
