import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { CommonModule, CurrencyPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { Observable, catchError, throwError } from 'rxjs';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartType, ChartOptions, ChartData } from 'chart.js';
import { FormsModule } from '@angular/forms';

interface Transaction {
  id?: number;
  dateOfTransaction: string;
  transactionType: 'Income' | 'Expenditure';
  category?: string | null;
  flatNumber?: string | null;
  amount: number;
  remarks?: string | null;
  documentProof?: string | File | null;
}

interface GetTransactionsApiResponse {
  message: string;
  status: number;
  Data: any[];
}

@Component({
  selector: 'app-income-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, NgChartsModule, FormsModule, DatePipe, CurrencyPipe],
  providers: [
    CurrencyPipe
  ],
  templateUrl: './income-dashboard.component.html',
  styleUrls: ['./income-dashboard.component.css']
})
export class IncomeDashboardComponent implements OnInit {

  private readonly API_GET_ALL_TRANSACTIONS_URL = '/rktapi/api/rkt/GetAllTransaction';

  allTransactions: Transaction[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  totalIncome = 0;
  totalExpenditure = 0;
  netBalance = 0;

  incomeCategorySummary: { category: string; amount: number }[] = [];
  expenditureCategorySummary: { category: string; amount: number }[] = [];

  recentTransactions: Transaction[] = [];

  selectedMonth = '';
  selectedYear = '';
  months: string[] = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  years: string[] = [];

  chartType: ChartType = 'line';

  lineChartLabels: string[] = [];
  // FIX: Change this line to be specific for 'line' chart data
  lineChartData: ChartData<'line'> = { labels: [], datasets: [] }; // Explicitly typed for 'line' chart
  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          title: (tooltipItems) => {
            return `Month: ${tooltipItems[0].label}`;
          },
          label: (tooltipItem) => {
            const label = tooltipItem.dataset.label || '';
            return `${label}: ${this.currencyPipe.transform(tooltipItem.raw as number, 'INR', 'symbol')}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category',
        title: {
          display: true,
          text: 'Month'
        },
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Amount (₹)'
        },
        ticks: {
          callback: (value) => this.currencyPipe.transform(value as number, 'INR', 'symbol')
        }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        // stepped: false,
        borderWidth: 2
      },
      point: {
        radius: 3,
        hoverRadius: 5,
        backgroundColor: 'white',
        borderColor: (context) => context.dataset.borderColor as string,
        borderWidth: 2
      }
    }
  };

  pieChartLabels: string[] = ['Total Income', 'Total Expenditure'];
  pieChartData = {
    labels: this.pieChartLabels,
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#4CAF50', '#F44336'],
      hoverBackgroundColor: ['#66BB6A', '#FF7043']
    }]
  };
  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const label = tooltipItem.label || '';
            return `${label}: ${this.currencyPipe.transform(tooltipItem.raw as number, 'INR', 'symbol')}`;
          }
        }
      }
    }
  };

  complaintsBarChartLabels: string[] = [];
  complaintsBarChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  complaintsBarChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (tooltipItems) => {
            return tooltipItems[0].label;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Complaint Type (Expenditure Category)'
        },
        ticks: {
          autoSkip: false,
          maxRotation: 90,
          minRotation: 90,
          font: {
            size: 10
          }
        },
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Complaints'
        },
        ticks: {
          precision: 0
        }
      }
    }
  };

  isBrowser = false;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private currencyPipe: CurrencyPipe
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.initYearOptions();
    this.fetchAndProcessTransactions();
  }

  initYearOptions(): void {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 10; y--) {
      this.years.push(y.toString());
    }
  }

  fetchAndProcessTransactions(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.http.get<GetTransactionsApiResponse>(this.API_GET_ALL_TRANSACTIONS_URL).pipe(
      catchError(this.handleError('fetchAndProcessTransactions'))
    ).subscribe({
      next: (response) => {
        if (response.status === 200 && response.message === 'SUCCESS') {
          this.allTransactions = response.Data.map(item => ({
            id: item.id,
            dateOfTransaction: item.transaction_date,
            transactionType: item.transaction_type,
            category: item.category,
            flatNumber: item.flat_number,
            amount: item.amount,
            remarks: item.description,
            documentProof: item.proof_doc
          }));
          this.applyFiltersAndProcess();
        } else {
          this.errorMessage = 'Invalid API response.';
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  applyFiltersAndProcess(): void {
    let filtered = this.allTransactions;

    if (this.selectedMonth && this.selectedYear) {
      filtered = filtered.filter(tx => {
        const date = new Date(tx.dateOfTransaction);
        return date.getMonth() + 1 === +this.selectedMonth && date.getFullYear() === +this.selectedYear;
      });
    }

    this.processFinancialData(filtered);

    this.recentTransactions = filtered
      .sort((a, b) => new Date(b.dateOfTransaction).getTime() - new Date(a.dateOfTransaction).getTime())
      .slice(0, 5);
  }

  processFinancialData(transactions: Transaction[]): void {
    this.totalIncome = 0;
    this.totalExpenditure = 0;
    const incomeMap = new Map<string, number>();
    const expenditureMap = new Map<string, number>();
    const monthlyIncomeMap = new Map<string, number>();
    const monthlyExpenditureMap = new Map<string, number>();

    const complaintsCountMap = new Map<string, number>();

    transactions.forEach(tx => {
      const date = new Date(tx.dateOfTransaction);
      // Format month as YYYY-MM for consistent sorting
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (tx.transactionType === 'Income') {
        this.totalIncome += tx.amount;
        incomeMap.set(tx.category || 'Uncategorized', (incomeMap.get(tx.category || 'Uncategorized') || 0) + tx.amount);
        monthlyIncomeMap.set(month, (monthlyIncomeMap.get(month) || 0) + tx.amount);
      } else { // Expenditure
        this.totalExpenditure += tx.amount;
        expenditureMap.set(tx.category || 'Uncategorized', (expenditureMap.get(tx.category || 'Uncategorized') || 0) + tx.amount);
        monthlyExpenditureMap.set(month, (monthlyExpenditureMap.get(month) || 0) + tx.amount);

        const category = tx.category || 'Uncategorized';
        complaintsCountMap.set(category, (complaintsCountMap.get(category) || 0) + 1);
      }
    });

    this.netBalance = this.totalIncome - this.totalExpenditure;

    this.incomeCategorySummary = Array.from(incomeMap).map(([category, amount]) => ({ category, amount }));
    this.expenditureCategorySummary = Array.from(expenditureMap).map(([category, amount]) => ({ category, amount }));

    // Sort months to ensure chronological order on the chart
    const months = Array.from(new Set([...monthlyIncomeMap.keys(), ...monthlyExpenditureMap.keys()])).sort();
    this.lineChartLabels = months;
    this.lineChartData = {
      labels: months,
      datasets: [
        {
          label: 'Income',
          data: months.map(m => monthlyIncomeMap.get(m) || 0),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.2)', // Slightly transparent background for fill
          tension: 0.4,
          fill: true,
          type: 'line', // Explicitly set type here for each dataset
          pointBackgroundColor: '#4CAF50',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#4CAF50',
          pointHoverBorderColor: '#fff'
        },
        {
          label: 'Expenditure',
          data: months.map(m => monthlyExpenditureMap.get(m) || 0),
          borderColor: '#F44336',
          backgroundColor: 'rgba(244, 67, 54, 0.2)', // Slightly transparent background for fill
          tension: 0.4,
          fill: true,
          type: 'line', // Explicitly set type here for each dataset
          pointBackgroundColor: '#F44336',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#F44336',
          pointHoverBorderColor: '#fff'
        }
      ]
    };

    this.pieChartData.datasets[0].data = [this.totalIncome, this.totalExpenditure];

    this.complaintsBarChartLabels = Array.from(complaintsCountMap.keys()).sort();
    this.complaintsBarChartData = {
      labels: this.complaintsBarChartLabels,
      datasets: [
        {
          label: 'Number of Complaints',
          data: this.complaintsBarChartLabels.map(label => complaintsCountMap.get(label) || 0),
          backgroundColor: '#64B5F6',
          borderColor: '#2196F3',
          borderWidth: 1,
          hoverBackgroundColor: '#42A5F5'
        }
      ]
    };
  }

  private handleError(operation = 'operation') {
    return (error: HttpErrorResponse): Observable<never> => {
      const msg = error.error instanceof ErrorEvent
        ? `Client Error during ${operation}: ${error.error.message}`
        : `Server Error during ${operation}: ${error.status}`;
      this.errorMessage = msg;
      console.error(`Detailed Error:`, error);
      return throwError(() => new Error(msg));
    };
  }
}