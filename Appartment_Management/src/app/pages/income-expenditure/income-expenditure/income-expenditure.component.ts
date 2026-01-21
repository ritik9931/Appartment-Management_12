import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, Subject, of } from 'rxjs'; // Added 'of' for potential error handling, not strictly used here
import { takeUntil, tap } from 'rxjs/operators'; // **Import 'tap' operator**
import { CommonModule, isPlatformBrowser } from '@angular/common';

interface ResidentProfile {
  userId: string;
  name: string;
  flatNumber: string | null;
}

interface Transaction {
  id?: number;
  dateOfTransaction: string;
  transactionType: 'Income' | 'Expenditure';
  category?: string | null;
  flatNumber?: string | null; // This will now be populated based on user_id for Income
  amount: number;
  remarks?: string | null;
  documentProof?: string | null;
  expend_to?: string | null;
  proof_doc_name?: string | null;
  userId?: string | null; // Keep userId from backend for mapping
}

interface TransactionCategory {
  id: number;
  name: string;
  cat_type: 'Income' | 'Expense';
}

interface ApiResponse<T> {
  message: string;
  status: number;
  Data: T;
}

@Component({
  selector: 'app-income-expenditure',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './income-expenditure.component.html',
  styleUrls: ['./income-expenditure.component.css']
})
export class IncomeExpenditureComponent implements OnInit, OnDestroy {
  transactionForm!: FormGroup;
  isAddingNew = false;
  editingTransactionId: number | null = null;
  selectedFileName: string | null = null;

  transactionTypes = ['Income', 'Expenditure'];
  incomeCategories: string[] = [];
  expenditureCategories: string[] = [];

  residentList: ResidentProfile[] = [];

  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  searchText = '';
  currentPage = 1;
  itemsPerPage = 5;
  totalPages = 1;

  isAdmin = true;
  isBrowser = false;
  showNotification = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' | 'info' = 'info';

  private destroy$ = new Subject<void>();

  private readonly API_GET_RESIDENTS_URL = '/rktapi/api/rkt/GetAllUserProfile';
  private readonly API_TRANSACTIONS_BASE_URL = '/rktapi/api/rkt/Transactions';  //sample api for update
  private readonly API_INSERT_TRANSACTION_URL = '/rktapi/api/rkt/InsertTransaction';
  private readonly API_GET_ALL_TRANSACTIONS_URL = '/rktapi/api/rkt/GetAllTransaction';
  private readonly API_GET_CATEGORY_MASTER_URL = '/rktapi/api/rkt/GetTransactionCategoryMaster';

  constructor(private fb: FormBuilder, private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const role = localStorage.getItem('userRole');
      this.isAdmin = role === 'admin';
    }
    this.initializeForm();

    // Ensure residents are fetched before transactions to map flat numbers
    this.fetchResidents()
      .subscribe({
        next: (response) => {
          // 'response' here is the actual ApiResponse<T> from the HTTP call
          if (response.status === 200 && response.message === 'SUCCESS') {
            this.residentList = response.Data.owner.map(item => ({
              userId: item.user_id,
              name: item.name,
              flatNumber: item.flat_number ?? null
            }));
          } else {
            this.residentList = [];
            this.showCustomNotification('Failed to load resident data.', 'error');
          }
          // Now that residentList is populated, fetch categories and then transactions
          this.fetchTransactionCategories();
          this.fetchTransactionRecords();
        },
        error: (err) => {
          console.error('Error fetching residents:', err);
          this.residentList = []; // Ensure it's empty on error
          this.showCustomNotification('Error loading resident data. Some features may not work correctly.', 'error');
          this.fetchTransactionCategories();
          this.fetchTransactionRecords();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForm(): void {
    this.transactionForm = this.fb.group({
      dateOfTransaction: ['', Validators.required],
      transactionType: ['Income', Validators.required],
      category: [null as string | null, Validators.required],
      flatNumber: [null as string | null],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      remarks: [''],
      transactionMode: [null],
      documentProof: [null as string | null],
      monthOfTransaction: [null as string | null],
    });

    this.transactionForm.get('transactionType')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(type => {
      this.toggleTransactionFields(type);
      this.transactionForm.get('category')?.setValue(null);
      this.selectedFileName = null;
      this.transactionForm.patchValue({ documentProof: null });
      this.transactionForm.get('monthOfTransaction')?.setValue(null);
    });

    this.transactionForm.get('category')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(category => {
      this.setRemarksRequired();
      this.setMonthOfTransactionValidators(category);
      this.toggleDateControlForCategory();
    });

    this.toggleTransactionFields(this.transactionForm.get('transactionType')?.value || 'Income');
    this.setRemarksRequired();
    this.setMonthOfTransactionValidators(this.transactionForm.get('category')?.value);
  }

  toggleTransactionFields(type: 'Income' | 'Expenditure'): void {
    const categoryControl = this.transactionForm.get('category');
    const flatNumberControl = this.transactionForm.get('flatNumber');
    const remarksControl = this.transactionForm.get('remarks');

    categoryControl?.clearValidators();
    flatNumberControl?.clearValidators();
    remarksControl?.clearValidators();

    categoryControl?.setValidators(Validators.required);
    if (type === 'Income') {
      flatNumberControl?.setValidators(Validators.required);
    } else {
      flatNumberControl?.clearValidators();
      flatNumberControl?.setValue(null);
    }

    this.setRemarksRequired();

    categoryControl?.updateValueAndValidity();
    flatNumberControl?.updateValueAndValidity();
    remarksControl?.updateValueAndValidity();
  }

  setRemarksRequired(): void {
    const remarksControl = this.transactionForm.get('remarks');
    const selectedCategory = this.transactionForm.get('category')?.value;

    if (selectedCategory === 'Others') {
      remarksControl?.setValidators(Validators.required);
    } else {
      remarksControl?.clearValidators();
      remarksControl?.setValue('');
    }
    remarksControl?.updateValueAndValidity();
  }

  setMonthOfTransactionValidators(category: string | null): void {
    const monthControl = this.transactionForm.get('monthOfTransaction');
    const trimmedCategory = category?.trim() ?? '';

    if (trimmedCategory === 'Monthly Maintenance') {
      monthControl?.setValidators(Validators.required);
    } else {
      monthControl?.clearValidators();
      monthControl?.setValue(null);
    }

    monthControl?.updateValueAndValidity();
  }

  toggleDateControlForCategory(): void {
    this.transactionForm.get('dateOfTransaction')?.setValidators(Validators.required);
    this.transactionForm.get('dateOfTransaction')?.updateValueAndValidity();
  }


  fetchResidents(): Observable<ApiResponse<{ owner: any[]; tenent: any[] }>> {
    return this.http.get<ApiResponse<{ owner: any[]; tenent: any[] }>>(this.API_GET_RESIDENTS_URL)
      .pipe(
        takeUntil(this.destroy$),
        catchError(this.handleError('fetchResidents'))
      );
  }

  fetchTransactionCategories(): void {
    this.http.get<ApiResponse<TransactionCategory[]>>(this.API_GET_CATEGORY_MASTER_URL)
      .pipe(takeUntil(this.destroy$), catchError(this.handleError('fetchTransactionCategories')))
      .subscribe(response => {
        if (response.status === 200 && response.message === 'SUCCESS') {
          this.incomeCategories = response.Data.filter(cat => cat.cat_type === 'Income').map(cat => cat.name);
          this.expenditureCategories = response.Data.filter(cat => cat.cat_type === 'Expense').map(cat => cat.name);

          if (!this.incomeCategories.includes('Others')) this.incomeCategories.push('Others');
          if (!this.expenditureCategories.includes('Others')) this.expenditureCategories.push('Others');
        } else {
          this.setFallbackCategories();
        }
      });
  }

  private setFallbackCategories(): void {
    this.incomeCategories = ['Monthly Maintenance', 'Advance Maintenance Payment', 'Late Payment Fee', 'Others'];
    this.expenditureCategories = ['Water Charges', 'Electricity Charges', 'Waste Management', 'Others'];
  }

  fetchTransactionRecords(): void {
    this.http.get<ApiResponse<any[]>>(this.API_GET_ALL_TRANSACTIONS_URL)
      .pipe(takeUntil(this.destroy$), catchError(this.handleError('fetchTransactionRecords')))
      .subscribe(response => {
        if (response.status === 200 && response.message === 'SUCCESS') {
          console.log('Fetched transactions:', response.Data);
          this.transactions = response.Data.map(item => {
            const transaction: Transaction = {
              id: item.id,
              dateOfTransaction: item.transaction_date,
              transactionType: item.transaction_type,
              category: item.category,
              amount: item.amount,
              remarks: item.description,
              documentProof: item.proof_doc ?? null,
              expend_to: item.expend_to ?? null,
              proof_doc_name: item.proof_doc_name ?? null,
              userId: item.user_id ?? null // Store user_id from backend
            };

            // Map user_id to flatNumber for Income transactions
            if (transaction.transactionType === 'Income' && transaction.userId) {
              const resident = this.residentList.find(r => r.userId === transaction.userId);
              transaction.flatNumber = resident ? resident.flatNumber : null;
            } else {
              // For Expenditure or if userId is missing, ensure flatNumber is null
              transaction.flatNumber = null;
            }
            return transaction;
          });
          this.applySearchAndPagination();
        }
      });
  }

  downloadTransactionDocument(id?: number): void {
    if (!id) {
      alert('Invalid transaction ID');
      return;
    }
    this.http.get<any>(`/rktapi/api/rkt/GetTransactionDoc?id=${id}`).subscribe(
      (response) => {
        const base64Data = response.Data[0]?.proof_doc;
        const fileName = response.Data[0]?.proof_doc_name;

        if (base64Data && fileName) {
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) =>
            byteCharacters.charCodeAt(i)
          );
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/octet-stream' });
          const link = document.createElement('a');
          link.href = window.URL.createObjectURL(blob);
          link.download = fileName;
          link.click();
        } else {
          alert('Document not available');
        }
      },
      (error) => {
        console.error('Download failed', error);
        alert('Failed to download document');
      }
    );
  }


  applySearchAndPagination(): void {
    const filter = this.searchText.trim().toLowerCase();
    this.filteredTransactions = this.transactions.filter(txn =>
      (txn.remarks?.toLowerCase().includes(filter) ?? false) ||
      (txn.category?.toLowerCase().includes(filter) ?? false) ||
      txn.transactionType.toLowerCase().includes(filter) ||
      (txn.flatNumber?.toLowerCase().includes(filter) ?? false) // Include flatNumber in search
    );

    this.totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages || 1;
  }

  get paginatedTransactions(): Transaction[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredTransactions.slice(start, start + this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText = input.value;
    this.currentPage = 1;
    this.applySearchAndPagination();
  }

  onAddEntry(): void {
    if (!this.isAdmin) return;
    this.isAddingNew = true;
    this.editingTransactionId = null;
    this.transactionForm.reset({
      transactionType: 'Income',
      dateOfTransaction: null,
      category: null,
      flatNumber: null,
      amount: '',
      remarks: '',
      transactionMode: null,
      documentProof: null,
      monthOfTransaction: null
    });
    this.selectedFileName = null;
    this.toggleTransactionFields('Income');
    this.setRemarksRequired();
    this.setMonthOfTransactionValidators(null);
  }

  onCancel(): void {
    this.isAddingNew = false;
    this.editingTransactionId = null;
    this.transactionForm.reset();
    this.selectedFileName = null;
    this.toggleTransactionFields(this.transactionForm.get('transactionType')?.value || 'Income');
    this.setRemarksRequired();
    this.setMonthOfTransactionValidators(null);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.transactionForm.patchValue({ documentProof: null });
      this.selectedFileName = null;
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.showCustomNotification('Only JPG, PNG, and PDF under 5MB are allowed.', 'error');
      input.value = '';
      this.transactionForm.patchValue({ documentProof: null });
      this.selectedFileName = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64string = (reader.result as string).split(',')[1];
      this.transactionForm.patchValue({
        documentProof: base64string,
      });
      this.selectedFileName = file.name; // Store the file name
    };
    reader.readAsDataURL(file);
  }

  async onSaveTransaction(): Promise<void> {
    this.markFormGroupTouched(this.transactionForm);

    if (this.transactionForm.invalid) {
      this.showCustomNotification('Please fill all required fields correctly.', 'error');
      return;
    }

    const formValue = this.transactionForm.getRawValue();

    let formattedDate: string | null = null;
    if (formValue.dateOfTransaction && formValue.dateOfTransaction.trim() !== '') {
      const d = new Date(formValue.dateOfTransaction);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().split('T')[0];
      }
    } else {
      formattedDate = null;
    }

    let userId: string | null = null;
    if (formValue.transactionType === 'Income') {
      userId = this.getUserIdByFlatNumber(formValue.flatNumber);
      if (!userId) {
        this.showCustomNotification('Unable to map flat number to user. Please verify resident list.', 'error');
        return;
      }
    }

    const description =
      formValue.category?.trim() === 'Monthly Maintenance' && formValue.monthOfTransaction
        ? `${formValue.remarks || ''} (Payment for: ${formValue.monthOfTransaction})`
        : formValue.remarks || null;

    const proofDocName = this.selectedFileName || null;

    let expendToDate: string | null = null;
    expendToDate = formattedDate;

    const payload: any = {
      transaction_date: formattedDate,
      transaction_type: formValue.transactionType,
      amount: formValue.amount,
      category: formValue.category,
      description: description,
      transaction_mode: formValue.transactionMode || null,
      proof_doc: formValue.documentProof || null,
      proof_doc_name: proofDocName,
      user_id: null,
      expend_to: expendToDate,
      maintenance_month: null
    };

    if (formValue.transactionType === 'Income') {
      payload.user_id = userId;
    }

if (formValue.category === 'Monthly Maintenance') {
  const rawMonth = formValue.monthOfTransaction?.trim();
  if (rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)) {
    const [year, month] = rawMonth.split('-').map(Number);
    // Create a date in UTC to avoid timezone issues
    payload.maintenance_month = new Date(Date.UTC(year, month - 1, 1))
      .toISOString()
      .split('T')[0]; // Gives "YYYY-MM-DD"
  } else {
    payload.maintenance_month = null;
  }
} else {
  payload.maintenance_month = null;
}

    for (const key in payload) {
      if (typeof payload[key] === 'string' && payload[key].trim() === '') {
        payload[key] = null;
      }
    }

    console.log('Final JSON payload:', JSON.stringify(payload));

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    let apiCall: Observable<ApiResponse<any>>;
    if (this.editingTransactionId !== null) {
      apiCall = this.http.put<ApiResponse<any>>(
        `${this.API_TRANSACTIONS_BASE_URL}/Update/${this.editingTransactionId}`,
        JSON.stringify(payload),
        { headers }
      );
    } else {
      apiCall = this.http.post<ApiResponse<any>>(
        this.API_INSERT_TRANSACTION_URL,
        JSON.stringify(payload),
        { headers }
      );
    }

    apiCall
      .pipe(
        takeUntil(this.destroy$),
        catchError(this.handleError('saveTransaction'))
      )
      .subscribe({
        next: (response) => {
          if (response.status === 200 || response.status === 201) {
            this.showCustomNotification('Transaction saved successfully!', 'success');
            this.onCancel();
            this.fetchTransactionRecords();
          } else {
            this.showCustomNotification(
              `Failed to save transaction: ${response.message || 'Unknown error'}`,
              'error'
            );
            console.warn('❌ Failed response:', response);
          }
        },
        error: (err) => {
          console.error('❌ API Error:', err);
        }
      });
  }

  getUserIdByFlatNumber(flatNumber: string | null): string | null {
    const resident = this.residentList.find(r => r.flatNumber === flatNumber);
    return resident?.userId ?? null;
  }

  editTransaction(record: Transaction): void {
    if (!this.isAdmin) return;

    this.isAddingNew = true;
    this.editingTransactionId = record.id ?? null;

    const monthValue = record.category?.trim() === 'Monthly Maintenance' && record.dateOfTransaction
      ? record.dateOfTransaction.slice(0, 7)
      : null;

    let flatNumberToPatch: string | null = null;
    if (record.transactionType === 'Income' && record.userId) {
      const resident = this.residentList.find(r => r.userId === record.userId);
      flatNumberToPatch = resident ? resident.flatNumber : null;
    }

    this.transactionForm.patchValue({
      dateOfTransaction: record.dateOfTransaction,
      transactionType: record.transactionType,
      category: record.category ?? null,
      flatNumber: flatNumberToPatch, // Use the mapped flatNumber
      amount: record.amount,
      remarks: record.remarks ?? '',
      documentProof: record.documentProof ?? null,
      monthOfTransaction: monthValue
    });

    this.toggleTransactionFields(record.transactionType);
    this.setRemarksRequired();
    this.setMonthOfTransactionValidators(record.category ?? null);
    this.selectedFileName = record.proof_doc_name || (record.documentProof ? 'Existing Document' : null);
  }

  deleteTransaction(id: number): void {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.http.get(`/rktapi/api/rkt/DeleteTransaction?id=${id}`).subscribe({
        next: () => {
          alert('Transaction deleted successfully.');
          this.fetchTransactionRecords(); // Refresh list
        },
        error: (err) => {
          console.error('Delete failed', err);
          alert('Failed to delete transaction.');
        }
      });
    }
  }


  markFormGroupTouched(formGroup: FormGroup | AbstractControl): void {
    if (formGroup instanceof FormGroup) {
      Object.values(formGroup.controls).forEach(control => {
        control.markAsTouched();
        if (control instanceof FormGroup) {
          this.markFormGroupTouched(control);
        }
      });
    }
  }

  get isDocumentProofString(): boolean {
    const doc = this.transactionForm.get('documentProof')?.value;
    return typeof doc === 'string' && doc.length > 0;
  }

  handleError(operation = 'operation') {
    return (error: HttpErrorResponse): Observable<never> => {
      const message = `Error during ${operation}: ${error.message || 'Unknown error'}`;
      this.showCustomNotification(message, 'error');
      return throwError(() => new Error(message));
    };
  }

  showCustomNotification(message: string, type: 'success' | 'error' | 'info'): void {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotification = true;
    setTimeout(() => this.hideCustomNotification(), 5000);
  }

  hideCustomNotification(): void {
    this.showNotification = false;
    this.notificationMessage = '';
  }

  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}