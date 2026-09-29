import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface ResidentProfile {
  userId: string;
  password?: string;
  name: string;
  userType: string;
  designation?: string;
  contactNumber: string;
  emailAddress: string;
  alternateContactNumber?: string;
  numberOfFamilyMembers?: number | null;
  flatNumber: string;
  flatType: string;
  carParking: string;
  numberOfCarParkingSlots?: number | null;
  maintenanceCharges?: number | null;
  currentResident: string;
  saleDeedDoc?: string | File | null;
  saleDeedDocName?: string | null;
  createdAt?: string | null;
  id?: number;
  owner_id?: number;

  tenantName?: string | null;
  rentAgreement?: string | File | null;
  rentAgreementName?: string | null;
  aadharCard?: string | File | null;
  aadharCardName?: string | null;
  policeVerification?: string | File | null;
  policeVerificationName?: string | null;
  tenantContactNumber?: string | null;
  tenantAlternateContactNumber?: string | null;
  isActive?: boolean | null;
  fromDate?: string | null;
  toDate?: string | null;
  ownerName?: string | null;
}

// API Response Interfaces
interface GetAllUsersApiResponse {
  message: string;
  status: number;
  Data: { owner: any[]; tenent?: any[]; };
}

interface SingleUserProfileApiResponse {
  message: string;
  status: number;
  Data: any[];
}

interface DeleteApiResponse {
  message: string;
  status: number;
  Data?: any;
}

function fileRequiredValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)) {
    return { requiredFile: true };
  }
  return null;
}

@Component({
  selector: 'app-profile-management',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HttpClientModule, FormsModule],
  templateUrl: './resident-profile.component.html',
  styleUrls: ['./resident-profile.component.css'],
  providers: [DatePipe]
})
export class ProfileManagementComponent implements OnInit {
  residentForm!: FormGroup;
  residentList: ResidentProfile[] = [];
  filteredResidents: ResidentProfile[] = [];
  paginatedResidents: ResidentProfile[] = [];

  allAvailableFlatNumbers: string[] = [];
  showFlatNumbersModal: boolean = false;

  isAddingNew = false;
  currentUserId: string | null = null;

  isAdmin: boolean = false;
  isBrowser: boolean;

  private residentBaseUrl = 'https://www.nomad.org.in/rkt/api/rkt';

  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 0;
  pages: number[] = [];
  searchTerm: string = '';

  tenantSearchTerm = '';
  tenantCurrentPage = 1;
  tenantItemsPerPage = 10;
  tenantTotalPages: number = 0;

  allTenants: ResidentProfile[] = [];
  filteredTenants: ResidentProfile[] = [];
  paginatedTenants: ResidentProfile[] = [];

  // Tenant form for adding new tenant
  isAddingNewTenant = false;
  tenantForm!: FormGroup;

  // ADD THIS NEW PROPERTY:
  selectedFlatFromModal: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private datePipe: DatePipe
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const role = localStorage.getItem('userRole');
      this.isAdmin = (role === 'admin');
      console.log('User role from localStorage:', role, 'Is Admin:', this.isAdmin);
    }

    this.initializeForm();
    this.initializeTenantForm(); // Initialize the new tenant form
    this.fetchResidents();

    this.route.queryParams.subscribe(params => {
      const mode = params['mode'];
      const userId = params['userId'];

      this.isAddingNew = false;
      this.currentUserId = null;
      this.residentForm.enable();

      if (mode === 'add') {
        this.onAddResident();
      } else if (mode === 'view' && userId) {
        this.currentUserId = userId;
        this.fetchResidentDetailsForView(userId);
      } else if (mode === 'edit' && userId) {
        this.currentUserId = userId;
        this.fetchResidentDetailsForEdit(userId);
      }
    });
    this.residentForm.get('carParking')?.valueChanges.subscribe(value => {
  const slotControl = this.residentForm.get('numberOfCarParkingSlots');
  if (value === true || value === 'true') {
    slotControl?.enable();
  } else {
    slotControl?.disable();
    slotControl?.reset();
  }
});

  }

  // NEW METHOD TO HANDLE BASE64 DOWNLOAD FOR SALE DEED
  downloadSaleDeed(userId: string, fileName: string): void {
    if (!this.isBrowser) {
      alert('File download is only available in browser environment.');
      return;
    }

    const apiUrl = `https://www.nomad.org.in/rkt/api/rkt/GetSaledeedByUserId?userId=${encodeURIComponent(userId)}`;

    this.http.get<{ message: string, status: number, Data: [{ sale_deed_doc: string, sale_deed_doc_name: string }] }>(apiUrl)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error fetching sale deed document:', error);
          alert('Failed to fetch sale deed document. Please try again.');
          return new Observable<any>(); // Return an empty observable to prevent further processing
        })
      )
      .subscribe(response => {
        if (response.status === 200 && response.Data && response.Data.length > 0 && response.Data[0].sale_deed_doc) {
          const base64Data = response.Data[0].sale_deed_doc;
          const mimeType = this.getMimeTypeFromFileName(fileName); // Determine MIME type based on file extension

          try {
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);

            const blob = new Blob([byteArray], { type: mimeType });
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = fileName; 
            document.body.appendChild(a); 
            a.click();
            document.body.removeChild(a); 
            window.URL.revokeObjectURL(url); 

          } catch (e) {
            console.error('Error decoding Base64 or creating blob:', e);
            alert('Could not process the document for download. It might be corrupted.');
          }
        } else {
          alert('Sale deed document not found or invalid response from server.');
        }
      });
  }

  // Helper function to determine MIME type (add this method to your component class)
  private getMimeTypeFromFileName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'doc':
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      // Add more cases as needed for other file types
      default:
        return 'application/octet-stream'; // Generic binary file
    }
  }

  // NEW METHOD: downloadTenantDocument
  downloadTenantDocument(tenantId: number | undefined, docType: 'rent' | 'aadhar' | 'police', fileName: string | null | undefined): void {
    if (!this.isBrowser) {
      alert('File download is only available in browser environment.');
      return;
    }
    if (!tenantId) {
      alert('Tenant ID is missing for document download.');
      return;
    }
    if (!fileName) {
      alert('Document file name is missing.');
      return;
    }



    const apiUrl = `https://www.nomad.org.in/rkt/api/rkt/DownloadTanentDocument?id=${encodeURIComponent(tenantId)}&docType=${docType}`;

     this.http.get(apiUrl, { responseType: 'blob' }) // Expect a binary Blob response
    .pipe(
      catchError((error: HttpErrorResponse) => {
        console.error(`Error fetching ${docType} document:`, error);
        alert(`Failed to fetch ${docType} document. Please try again.`);
        return new Observable<any>(); // Re-throw or return empty observable
      })
    )
    .subscribe(blobResponse => { // 'blobResponse' will now be a Blob object
      console.log('Received Blob response:', blobResponse);
      console.log('File Name for Download:', fileName);

      const mimeType = this.getMimeTypeFromFileName(fileName!); // Still use this for the Blob type

      if (blobResponse && fileName) {
        try {
          const url = window.URL.createObjectURL(blobResponse); // Create URL directly from the Blob
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName; // Use the provided fileName for the download
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

        } catch (e) {
          console.error('Error processing Blob for download:', e);
          alert('Could not process the document for download. It might be corrupted.');
        }
      } else {
        alert(`${docType} document not found or invalid data received.`);
      }
    });
  }

  // Fetches resident details for view mode and disables the form
  fetchResidentDetailsForView(userId: string): void {
    console.log(`Fetching resident details for view: ${userId}`);
    this.http.get<SingleUserProfileApiResponse>(`${this.residentBaseUrl}/GetUserProfileByUserId?userId=${encodeURIComponent(userId)}`).subscribe({
      next: response => {
        console.log('API Response for view details:', response);
        if (response.status === 200 && response.message === 'SUCCESS' && response.Data && response.Data.length > 0) {
          const item = response.Data[0];
          const isTenantProfile = item.hasOwnProperty('owner_id') && item.hasOwnProperty('tanent_name');

          let resident: ResidentProfile;
          if (isTenantProfile) {
            resident = {
              userId: item.owner_id,
              name: item.tanent_name,
              userType: 'Tenant',
              contactNumber: item.contact_number1,
              emailAddress: '',
              flatNumber: '',
              flatType: '',
              carParking: 'false',
              currentResident: 'Tenant',
              tenantName: item.tanent_name,
              rentAgreement: item.rent_agreement,
              rentAgreementName: item.rent_agreement_name,
              aadharCard: item.aadhar_card,
              aadharCardName: item.aadhar_card_name,
              policeVerification: item.police_verification,
              policeVerificationName: item.police_verification_name,
              tenantContactNumber: item.contact_number1,
              tenantAlternateContactNumber: item.contact_number2,
              isActive: item.is_active === 'YES' || item.is_active === true,
              fromDate: item.from_date,
              toDate: item.to_date,
            };
            // Try to find the corresponding flat number if it's not in the tenant profile itself
            const correspondingOwner = this.residentList.find(r => r.userId === item.owner_id && r.currentResident === 'Owner');
            if (correspondingOwner) {
              resident.flatNumber = correspondingOwner.flatNumber;
              resident.flatType = correspondingOwner.flatType;
              resident.carParking = correspondingOwner.carParking;
              resident.numberOfCarParkingSlots = correspondingOwner.numberOfCarParkingSlots;
              resident.maintenanceCharges = correspondingOwner.maintenanceCharges;
            } else {
              this.http.get<SingleUserProfileApiResponse>(`${this.residentBaseUrl}/GetUserProfileByUserId?userId=${encodeURIComponent(item.owner_id)}`).subscribe(ownerRes => {
                if (ownerRes.status === 200 && ownerRes.Data && ownerRes.Data.length > 0) {
                  const ownerData = ownerRes.Data[0];
                  if (ownerData.flat_number) {
                    resident.flatNumber = ownerData.flat_number;
                    resident.flatType = ownerData.flat_type;
                    resident.carParking = String(ownerData.car_parking);
                    resident.numberOfCarParkingSlots = ownerData.number_of_car_parking ? +ownerData.number_of_car_parking : null;
                    resident.maintenanceCharges = ownerData.maintenence_per_month ? +ownerData.maintenence_per_month : null;
                    this.editResident(resident);
                    this.residentForm.disable();
                  }
                }
              });
            }
          } else {
            resident = this.mapApiItemToResidentProfile(item);
          }

          this.editResident(resident);
          this.residentForm.disable();
        } else {
          console.warn('Resident not found or data error for view:', response);
          if (this.isBrowser) {
            alert('Resident not found or data error. Navigating back.');
          }
          this.router.navigate(['/residents']);
        }
      },
      error: (error) => {
        console.error('Failed to fetch resident details for view:', error);
        if (this.isBrowser) {
          alert('Failed to fetch resident details. Check console for details. Navigating back.');
        }
        this.router.navigate(['/residents']);
      }
    });
  }

  // Fetches resident details for edit mode
  fetchResidentDetailsForEdit(userId: string): void {
    console.log(`Fetching resident details for edit: ${userId}`);
    this.http.get<SingleUserProfileApiResponse>(`${this.residentBaseUrl}/GetUserProfileByUserId?userId=${encodeURIComponent(userId)}`).subscribe({
      next: response => {
        console.log('API Response for edit details:', response);
        if (response.status === 200 && response.message === 'SUCCESS' && response.Data && response.Data.length > 0) {
          const item = response.Data[0];
          const isTenantProfile = item.hasOwnProperty('owner_id') && item.hasOwnProperty('tanent_name');

          let resident: ResidentProfile;
          if (isTenantProfile) {
            resident = {
              userId: item.owner_id,
              name: item.tanent_name,
              userType: 'Tenant',
              contactNumber: item.contact_number1,
              emailAddress: '',
              flatNumber: '',
              flatType: '',
              carParking: 'false',
              currentResident: 'Tenant',
              tenantName: item.tanent_name,
              rentAgreement: item.rent_agreement,
              rentAgreementName: item.rent_agreement_name,
              aadharCard: item.aadhar_card,
              aadharCardName: item.aadhar_card_name,
              policeVerification: item.police_verification,
              policeVerificationName: item.police_verification_name,
              tenantContactNumber: item.contact_number1,
              tenantAlternateContactNumber: item.contact_number2,
              isActive: item.is_active === 'YES' || item.is_active === true,
              fromDate: item.from_date,
              toDate: item.to_date,
            };
            const correspondingOwner = this.residentList.find(r => r.userId === item.owner_id && r.currentResident === 'Owner');
            if (correspondingOwner) {
              resident.flatNumber = correspondingOwner.flatNumber;
              resident.flatType = correspondingOwner.flatType;
              resident.carParking = correspondingOwner.carParking;
              resident.numberOfCarParkingSlots = correspondingOwner.numberOfCarParkingSlots;
              resident.maintenanceCharges = correspondingOwner.maintenanceCharges;
            } else {
              this.http.get<SingleUserProfileApiResponse>(`${this.residentBaseUrl}/GetUserProfileByUserId?userId=${encodeURIComponent(item.owner_id)}`).subscribe(ownerRes => {
                if (ownerRes.status === 200 && ownerRes.Data && ownerRes.Data.length > 0) {
                  const ownerData = ownerRes.Data[0];
                  if (ownerData.flat_number) {
                    resident.flatNumber = ownerData.flat_number;
                    resident.flatType = ownerData.flat_type;
                    resident.carParking = String(ownerData.car_parking);
                    resident.numberOfCarParkingSlots = ownerData.number_of_car_parking ? +ownerData.number_of_car_parking : null;
                    resident.maintenanceCharges = ownerData.maintenence_per_month ? +ownerData.maintenence_per_month : null;
                    this.editResident(resident);
                  }
                }
              });
            }
          } else {
            resident = this.mapApiItemToResidentProfile(item);
          }
          this.editResident(resident);
        } else {
          console.warn('Resident not found for editing or data error:', response);
          if (this.isBrowser) {
            alert('Resident not found for editing or data error. Navigating back.');
          }
          this.router.navigate(['/residents']);
        }
      },
      error: (error) => {
        console.error('Failed to fetch resident details for edit:', error);
        if (this.isBrowser) {
          alert('Failed to fetch resident details for edit. Check console for details. Navigating back.');
        }
        this.router.navigate(['/residents']);
      }
    });
  }

  private mapApiItemToResidentProfile(item: any): ResidentProfile {
    const isDirectTenantEntry = item.hasOwnProperty('owner_id') && item.hasOwnProperty('tanent_name');

    const resident: ResidentProfile = {
      userId: item.user_id || item.owner_id,
      password: item.password,
      name: item.name || item.tanent_name || '',
      userType: item.user_type || 'Tenant',
      designation: item.designation,
      contactNumber: item.contact_number1,
      emailAddress: item.email,
      alternateContactNumber: item.contact_number2,
      numberOfFamilyMembers: item.no_of_family_members !== undefined && item.no_of_family_members !== null ? +item.no_of_family_members : undefined,
      flatNumber: item.flat_number || '',
      flatType: item.flat_type || '',
      carParking: String(item.car_parking || 'false'),
      numberOfCarParkingSlots: item.number_of_car_parking !== undefined && item.number_of_car_parking !== null ? +item.number_of_car_parking : undefined,
      maintenanceCharges: item.maintenence_per_month !== undefined && item.maintenence_per_month !== null ? +item.maintenence_per_month : undefined,
      currentResident: item.current_resident || 'Owner', // Default to 'Owner' if not explicitly set (e.g., from owner array)

      // Sale deed fields (primarily for owners)
      saleDeedDoc: item.sale_deed_doc || null,
      saleDeedDocName: item.sale_deed_doc_name || null,
      createdAt: item.created_at || null,

      id: item.id,

      // Tenant-specific fields - directly from the item if it's a tenant entry
      tenantName: isDirectTenantEntry ? item.tanent_name : undefined,
      rentAgreement: isDirectTenantEntry ? item.rent_agreement : null,
      rentAgreementName: isDirectTenantEntry ? item.rent_agreement_name : null,
      aadharCard: isDirectTenantEntry ? item.aadhar_card : null,
      aadharCardName: isDirectTenantEntry ? item.aadhar_card_name : null,
      policeVerification: isDirectTenantEntry ? item.police_verification : null,
      policeVerificationName: isDirectTenantEntry ? item.police_verification_name : null,
      tenantContactNumber: isDirectTenantEntry ? item.contact_number1 : undefined,
      tenantAlternateContactNumber: isDirectTenantEntry ? item.contact_number2 : undefined,
      isActive: isDirectTenantEntry ? (item.is_active === 'YES' || item.is_active === true) : undefined,
      fromDate: isDirectTenantEntry ? item.from_date : undefined,
      toDate: isDirectTenantEntry ? item.to_date : undefined,
    };

    // Clean up empty strings to null for document names if that's preferred
    if (resident.saleDeedDocName === "") {
      resident.saleDeedDocName = null;
    }
    if (resident.rentAgreementName === "") {
      resident.rentAgreementName = null;
    }
    if (resident.aadharCardName === "") {
      resident.aadharCardName = null;
    }
    if (resident.policeVerificationName === "") {
      resident.policeVerificationName = null;
    }

    // Ensure currentResident is correctly set based on the type of item
    if (isDirectTenantEntry) {
      resident.currentResident = 'Tenant';
    } else if (item.current_resident) {
      resident.currentResident = item.current_resident;
    }


    return resident;
  }

  // Helper to check if a document field is a non-empty string (likely a URL or base64)
  isSaleDeedDocStringAndNotEmpty(doc: string | File | null | undefined): boolean {
    return typeof doc === 'string' && doc.trim().length > 0;
  }

  // Helper to check if a document field is an empty string
  isSaleDeedDocEmptyString(doc: string | File | null | undefined): boolean {
    return typeof doc === 'string' && doc.trim().length === 0;
  }

  // General helper for checking document fields (string presence)
  isDocumentStringAndNotEmpty(doc: string | File | null | undefined): boolean {
    return typeof doc === 'string' && doc.trim().length > 0;
  }

  // Type guard to check if a value is a File object
  isFile(value: any): value is File {
    return value instanceof File;
  }

  // Initializes the Reactive Form
  initializeForm(): void {
    this.residentForm = this.fb.group({
      userId: ['', Validators.required],
      password: [''],
      name: ['', Validators.required],
      userType: ['Admin', Validators.required], // Default to Admin
      designation: [''],
      contactNumber: ['', Validators.required],
      emailAddress: ['', [Validators.required, Validators.email]],
      alternateContactNumber: [''],
      numberOfFamilyMembers: [null],
      flatNumber: ['', Validators.required],
      flatType: ['1BHK', Validators.required],
      carParking: ['false'],
      numberOfCarParkingSlots: [{ value: null, disabled: true }],
      maintenanceCharges: [null],
      currentResident: ['Owner', Validators.required], // Default to Owner
      saleDeedDoc: [null],
      saleDeedDocName: [''],

      // Tenant-specific form controls
      tenantName: [''],
      rentAgreement: [null],
      rentAgreementName: [''],
      aadharCard: [null],
      aadharCardName: [''],
      policeVerification: [null],
      policeVerificationName: [''],
      tenantContactNumber: [''],
      tenantAlternateContactNumber: [''],
      isActive: [true], // Default for isActive
      fromDate: [''],
      toDate: [''],
    });

    // Subscribe to carParking changes
    this.residentForm.get('carParking')?.valueChanges.subscribe(value => {
      const numSlotsControl = this.residentForm.get('numberOfCarParkingSlots');
      if (value === 'true') {
        numSlotsControl?.setValidators(Validators.required);
        numSlotsControl?.enable();
      } else {
        numSlotsControl?.clearValidators();
        numSlotsControl?.setValue(null);
        numSlotsControl?.disable();
      }
      numSlotsControl?.updateValueAndValidity();
    });

    // Subscribe to currentResident changes
    this.residentForm.get('currentResident')?.valueChanges.subscribe(value => {
      this.toggleTenantFields(value === 'Tenant');
    });

    // Initial call to set up tenant field state based on default value
    this.toggleTenantFields(this.residentForm.get('currentResident')?.value === 'Tenant');
  }

  // Initializes the Tenant specific Reactive Form
  initializeTenantForm(): void {
    this.tenantForm = this.fb.group({
      flatNumber: ['', Validators.required], // Owner's flat number for the tenant
      tenantName: ['', Validators.required],
      tenantContactNumber: ['', Validators.required],
      tenantAlternateContactNumber: [''],
      fromDate: ['', Validators.required],
      toDate: ['', Validators.required],
      rentAgreement: [null],
      rentAgreementName: [''],
      aadharCard: [null],
      aadharCardName: [''],
      policeVerification: [null],
      policeVerificationName: [''],
      isActive: [true],
    });
  }

  // Toggles required validators and enables/disables tenant-specific form fields
  toggleTenantFields(isTenant: boolean): void {
    const tenantFields = [
      'tenantName', 'tenantContactNumber', 'tenantAlternateContactNumber',
      'rentAgreement', 'rentAgreementName', 'aadharCard', 'aadharCardName',
      'policeVerification', 'policeVerificationName', 'isActive',
      'fromDate', 'toDate'
    ];

    tenantFields.forEach(field => {
      const control = this.residentForm.get(field);
      if (!control) return;

      if (isTenant) {
        control.enable();
        const alwaysRequiredTenantFields = ['tenantName', 'tenantContactNumber', 'fromDate', 'toDate'];

if (isTenant) {
  control.enable();
  if (alwaysRequiredTenantFields.includes(field)) {
    control.setValidators(Validators.required);
  } else {
    control.clearValidators(); // No validators for document fields
  }
}
      } else {
        control.clearValidators();
        if (!this.isFile(control.value)) { // Clear value only if it's not a File object
          control.setValue(field.includes('Name') ? '' : null);
        }
        if (field === 'isActive') control.setValue(true);
        control.disable();
      }
      control.updateValueAndValidity();
    });

    // Handle saleDeedDoc separately, it's only required for Owners
    const saleDeedControl = this.residentForm.get('saleDeedDoc');
    const saleDeedNameControl = this.residentForm.get('saleDeedDocName');

    if (saleDeedControl && saleDeedNameControl) {
      if (this.residentForm.get('currentResident')?.value === 'Owner') {
        saleDeedControl.enable();
        saleDeedNameControl.enable();

        saleDeedControl.clearValidators();
        saleDeedNameControl.clearValidators();

      } else {
        saleDeedControl.clearValidators();
        saleDeedNameControl.clearValidators();

        if (!this.isFile(saleDeedControl.value)) {
          saleDeedControl.setValue(null);
        }

        saleDeedNameControl.setValue('');
        saleDeedControl.disable();
        saleDeedNameControl.disable();
      }

      saleDeedControl.updateValueAndValidity();
      saleDeedNameControl.updateValueAndValidity();
    }

    // Disable userId field if editing existing resident
    if (this.currentUserId && !this.isAddingNew) {
      this.residentForm.get('userId')?.disable();
    } else {
      this.residentForm.get('userId')?.enable();
    }
  }

  // Helper to check if a control has a File object or a non-empty string value
  private hasFileOrBase64(value: any): boolean {
    return (value instanceof File) || (typeof value === 'string' && value.trim().length > 0);
  }

  // Handles click on "Add New Resident" button
  onAddResident(): void {
    if (!this.isAdmin) {
      if (this.isBrowser) {
        alert('You do not have permission to add new residents.');
      }
      return;
    }
    this.isAddingNew = true;
    this.currentUserId = null;
    this.residentForm.enable();
    this.residentForm.reset({
      userId: '', password: '', name: '', userType: 'Admin', designation: '',
      contactNumber: '', emailAddress: '', alternateContactNumber: '',
      numberOfFamilyMembers: null, flatNumber: '', flatType: '1BHK',
      carParking: 'false', numberOfCarParkingSlots: null, maintenanceCharges: null,
      currentResident: 'Owner', saleDeedDoc: null, saleDeedDocName: '',
      tenantName: '', rentAgreement: null, rentAgreementName: '',
      aadharCard: null, aadharCardName: '', policeVerification: null, policeVerificationName: '',
      tenantContactNumber: '', tenantAlternateContactNumber: '', isActive: true,
      fromDate: '', toDate: '',
    });
    this.toggleTenantFields(false);
    this.router.navigate([], { queryParams: { mode: 'add' } });
  }

  // Handles click on "Cancel" button
  onCancel(): void {
    this.isAddingNew = false;
    this.residentForm.reset();
    this.residentForm.enable();
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    this.fetchResidents(); // Refresh the lists
  }

  // Handles form submission (Save button)
  onSaveResident(event: Event): void {
    event.preventDefault();

    if (!this.isAdmin) {
      if (this.isBrowser) {
        alert('You do not have permission to save resident profiles.');
      }
      return;
    }

    this.markFormGroupTouched(this.residentForm);

    if (this.residentForm.invalid) {
      console.log('Form is invalid. Errors:', this.residentForm.controls);
      if (this.isBrowser) {
        alert('Please fill all required fields correctly.');
      }
      return;
    }

    this.saveUserProfile();
  }

  // Sends the user profile data to the backend API
  async saveUserProfile(): Promise<void> {
    const form = this.residentForm.getRawValue();
    const isTenant = form.currentResident === 'Tenant';

    const processFileToPayload = async (fileControlValue: File | string | null): Promise<string | null> => {
      if (fileControlValue instanceof File) {
        try {
          const base64Doc = await this.fileToBase64(fileControlValue);
          return base64Doc.split(',')[1];
        } catch (err) {
          throw new Error('Failed to process file for upload.');
        }
      } else if (typeof fileControlValue === 'string' && fileControlValue.trim().length > 0) {
        return fileControlValue;
      }
      return null;
    };

    try {
      const saleDeedDocBase64 = await processFileToPayload(form.saleDeedDoc);
      const rentAgreementBase64 = isTenant ? await processFileToPayload(form.rentAgreement) : null;
      const aadharCardBase64 = isTenant ? await processFileToPayload(form.aadharCard) : null;
      const policeVerificationBase64 = isTenant ? await processFileToPayload(form.policeVerification) : null;

      const payload: any = {
        user_id: form.userId,
        password: form.password,
        name: form.name,
        user_type: form.userType,
        designation: form.designation,
        contact_number1: form.contactNumber,
        contact_number2: form.alternateContactNumber,
        email: form.emailAddress,
        no_of_family_members: form.numberOfFamilyMembers,
        flat_number: form.flatNumber,
        flat_type: form.flatType,
        car_parking: String(form.carParking),
        number_of_car_parking: form.numberOfCarParkingSlots,
        maintenence_per_month: form.maintenanceCharges,
        current_resident: form.currentResident,
        sale_deed_doc: saleDeedDocBase64,
        sale_deed_doc_name: form.saleDeedDocName,
      };

      if (isTenant) {
        payload.tanentProfile = {
          owner_id: form.userId,
          tanent_name: form.tenantName,
          rent_agreement: rentAgreementBase64,
          rent_agreement_name: form.rentAgreementName,
          aadhar_card: aadharCardBase64,
          aadhar_card_name: form.aadharCardName,
          police_verification: policeVerificationBase64,
          police_verification_name: form.policeVerificationName,
          contact_number1: form.tenantContactNumber,
          contact_number2: form.tenantAlternateContactNumber,
          is_active: form.isActive,
          from_date: form.fromDate,
          to_date: form.toDate,
        };
      }
console.log('Sending Resident Profile Payload:', payload);

      let postUrl = `${this.residentBaseUrl}/InsertUserProfile`;

      console.log('Attempting to save user profile (owner/tenant) with payload:', payload);

      this.http.post(postUrl, payload).subscribe({
        next: (res: any) => {
          console.log('User Profile Save API Response:', res);
          if (res.status === 200) {
            if (this.isBrowser) {
              alert('Resident profile saved successfully!');
            }
            this.isAddingNew = false;
            this.residentForm.reset();
            this.fetchResidents();
            this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
          } else if (res.status === 409 && res.error?.Data === 'Duplicate UserId Found') {
            if (this.isBrowser) {
              alert('Error: This User ID is already taken.');
            }
          } else {
            if (this.isBrowser) {
              alert(`Failed to save resident: ${res.message || 'Unknown error'}`);
            }
          }
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error saving user profile:', error);
          if (this.isBrowser) {
            if (error.status === 409) {
              if (error.error?.Data === 'Duplicate UserId Found') {
                alert('Error: This User ID is already taken.');
              } else if (error.error?.message) {
                alert(`Conflict error: ${error.error.message}`);
              } else {
                alert('A conflict occurred while saving the profile. It might be a duplicate entry.');
              }
            } else if (error.status >= 400 && error.status < 500) {
              alert(`Client error saving profile: ${error.error?.message || error.message || 'Please check your input.'}`);
            } else if (error.status >= 500) {
              alert(`Server error saving profile: ${error.message || 'Please try again later.'}`);
            } else {
              alert(`An unexpected error occurred while saving the profile. Check console for details.`);
            }
          }
        }
      });
    } catch (error: any) {
      console.error('Error during file processing for payload:', error);
      if (this.isBrowser) {
        alert(`Error preparing documents for upload: ${error.message}`);
      }
    }
  }

  // MODIFY THIS METHOD: Handles click on "Add New Tenant" button
  onAddTenant(): void {
    if (!this.isAdmin) {
      if (this.isBrowser) {
        alert('You do not have permission to add new tenants.');
      }
      return;
    }
    this.isAddingNewTenant = true;
    this.tenantForm.reset({
      flatNumber: '', tenantName: '', tenantContactNumber: '',
      tenantAlternateContactNumber: '', fromDate: '', toDate: '',
      rentAgreement: null, rentAgreementName: '', aadharCard: null, aadharCardName: '',
      policeVerification: null, policeVerificationName: '', isActive: true,
    });
    this.tenantForm.enable();
    this.selectedFlatFromModal = null;
  }

  // MODIFY THIS METHOD: Handles cancel for tenant form
  onCancelTenant(): void {
    this.isAddingNewTenant = false;
    this.tenantForm.reset();
    // ADD THIS LINE: Reset selectedFlatFromModal
    this.selectedFlatFromModal = null;
  }

  // Handles saving new tenant
  async onSaveTenant(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.isAdmin) {
      if (this.isBrowser) {
        alert('You do not have permission to save tenant profiles.');
      }
      return;
    }

    this.markFormGroupTouched(this.tenantForm);

    if (this.tenantForm.invalid) {
      console.log('Tenant form is invalid. Errors:', this.tenantForm.controls);
      if (this.isBrowser) {
        alert('Please fill all required tenant fields correctly.');
      }
      return;
    }

    const form = this.tenantForm.getRawValue();

    const processFileToPayload = async (fileControlValue: File | string | null): Promise<string | null> => {
      if (fileControlValue instanceof File) {
        try {
          const base64Doc = await this.fileToBase64(fileControlValue);
          return base64Doc.split(',')[1];
        } catch (err) {
          throw new Error('Failed to process file for upload.');
        }
      } else if (typeof fileControlValue === 'string' && fileControlValue.trim().length > 0) {
        return fileControlValue;
      }
      return null;
    };

    try {
      const rentAgreementBase64 = await processFileToPayload(form.rentAgreement);
      const aadharCardBase64 = await processFileToPayload(form.aadharCard);
      const policeVerificationBase64 = await processFileToPayload(form.policeVerification);

      // Find the owner_id based on the selected flatNumber
      const ownerFlat = this.residentList.find(r => r.flatNumber === form.flatNumber && r.currentResident === 'Owner');
      if (!ownerFlat) {
        if (this.isBrowser) {
          alert('Selected Flat Number does not correspond to an existing owner profile. Please select a valid flat number.');
        }
        return;
      }

      const payload = {
        // MODIFY THIS LINE: Use ownerFlat.userId as owner_id
        owner_id: ownerFlat.userId,
        tanent_name: form.tenantName,
        contact_number1: form.tenantContactNumber,
        contact_number2: form.tenantAlternateContactNumber,
        from_date: form.fromDate,
        to_date: form.toDate,
        rent_agreement: rentAgreementBase64,
        rent_agreement_name: form.rentAgreementName,
        aadhar_card: aadharCardBase64,
        aadhar_card_name: form.aadharCardName,
        police_verification: policeVerificationBase64,
        police_verification_name: form.policeVerificationName,
        is_active: form.isActive,
      };

      const postUrl = `${this.residentBaseUrl}/InsertTanentProfile`;

      console.log('Attempting to save tenant profile with payload:', payload);

      this.http.post(postUrl, payload).subscribe({
        next: (res: any) => {
          console.log('Tenant Profile Save API Response:', res);
          if (res.status === 200) {
            if (this.isBrowser) {
              alert('Tenant profile saved successfully!');
            }
            this.isAddingNewTenant = false;
            this.tenantForm.reset();
            this.fetchResidents(); // Refresh all lists
          } else {
            if (this.isBrowser) {
              alert(`Failed to save tenant: ${res.message || 'Unknown error'}`);
            }
          }
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error saving tenant profile:', error);
          if (this.isBrowser) {
            alert(`Failed to save tenant. Server error: ${error.message || 'Check console for details.'}`);
          }
        }
      });
    } catch (error: any) {
      console.error('Error during tenant file processing for payload:', error);
      if (this.isBrowser) {
        alert(`Error preparing tenant documents for upload: ${error.message}`);
      }
    }
  }

  // Handles deleting a tenant (new method)
deleteTenant(tenantId?: number, ownerId?: number): void {
  if (tenantId === undefined || tenantId === null || ownerId === undefined || ownerId === null) {
    console.warn('Invalid or missing tenant ID or owner ID');
    if (this.isBrowser) {
      alert('Tenant ID or Owner ID is missing. Cannot delete tenant.');
    }
    return;
  }

  // Step 2: Check admin permission
  if (!this.isAdmin) {
    if (this.isBrowser) {
      alert('You do not have permission to delete tenant profiles.');
    }
    return;
  }

  if (this.isBrowser && confirm(`Are you sure you want to delete tenant with ID: '${tenantId}' and Owner ID: '${ownerId}'?`)) {
    const deleteUrl = `${this.residentBaseUrl}/DeleteTanentProfile?id=${tenantId}&owner_id=${ownerId}`;
    console.log(`Attempting to delete tenant: ${tenantId} for owner: ${ownerId}`);

    this.http.get<DeleteApiResponse>(deleteUrl).subscribe({
      next: (response) => {
        console.log('Delete Tenant API Response:', response);
        if (response.status === 200 && (response.message === 'SUCCESS' || response.message === 'Success')) {
          if (this.isBrowser) {
            alert(`Tenant with ID '${tenantId}' deleted successfully!`);
          }
          this.fetchResidents();
        } else {
          if (this.isBrowser) {
            alert(`Failed to delete tenant: ${response.message || response.Data || 'Unknown error'}`);
          }
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error deleting tenant:', error);
        if (this.isBrowser) {
          alert(`Failed to delete tenant. Server error: ${error.message || 'Check console for details.'}`);
        }
      }
    });
  }
}






  // MODIFY THIS METHOD: Handles file selection for document upload inputs
  onFileUpload(event: Event, field: keyof ResidentProfile): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    let control: AbstractControl | null;
    let nameControl: AbstractControl | null;

    // Determine which form and controls to update based on the current context (resident form or tenant form)
    const targetForm = this.isAddingNewTenant ? this.tenantForm : this.residentForm;

    control = targetForm.get(field as string);
    nameControl = targetForm.get((field + 'Name') as string);


    if (file) {
      control?.patchValue(file);
      nameControl?.patchValue(file.name);

       if (field === 'saleDeedDoc') {
        console.log(`[saleDeedDoc] File name from input:`, file.name);
        console.log(`[saleDeedDoc] nameControl value after patch:`, nameControl?.value);
    }
    } else {
      control?.patchValue(null);
      nameControl?.patchValue('');
    }

    control?.updateValueAndValidity();
    nameControl?.updateValueAndValidity();
  }

  // Patches resident data into the form for editing/viewing
  editResident(resident: ResidentProfile): void {
    if (!this.isAdmin && this.router.url.includes('mode=edit')) {
      if (this.isBrowser) {
        alert('You do not have permission to edit resident profiles.');
      }
      return;
    }

    this.isAddingNew = false;
    this.currentUserId = resident.userId;
    this.residentForm.enable();

    this.residentForm.patchValue({
      userId: resident.userId,
      name: resident.name,
      userType: resident.userType,
      designation: resident.designation,
      contactNumber: resident.contactNumber,
      emailAddress: resident.emailAddress,
      alternateContactNumber: resident.alternateContactNumber,
      numberOfFamilyMembers: resident.numberOfFamilyMembers,
      flatNumber: resident.flatNumber,
      flatType: resident.flatType,
      carParking: String(resident.carParking),
      numberOfCarParkingSlots: resident.numberOfCarParkingSlots,
      maintenanceCharges: resident.maintenanceCharges,
      currentResident: resident.currentResident,
      saleDeedDoc: resident.saleDeedDoc,
      saleDeedDocName: resident.saleDeedDocName,

      tenantName: resident.tenantName,
      rentAgreement: resident.rentAgreement,
      rentAgreementName: resident.rentAgreementName,
      aadharCard: resident.aadharCard,
      aadharCardName: resident.aadharCardName,
      policeVerification: resident.policeVerification,
      policeVerificationName: resident.policeVerificationName,
      tenantContactNumber: resident.tenantContactNumber,
      tenantAlternateContactNumber: resident.tenantAlternateContactNumber,
      isActive: resident.isActive,
      fromDate: resident.fromDate ? this.datePipe.transform(resident.fromDate, 'yyyy-MM-dd') : '',
      toDate: resident.toDate ? this.datePipe.transform(resident.toDate, 'yyyy-MM-dd') : '',
    });

    this.toggleTenantFields(resident.currentResident === 'Tenant');
    this.residentForm.get('userId')?.disable(); // Disable userId when editing
  }

  // Deletes a resident by userId
  deleteResident(userId: string): void {
    if (!this.isAdmin) {
      if (this.isBrowser) {
        alert('You do not have permission to delete resident profiles.');
      }
      return;
    }

    if (this.isBrowser && confirm(`Are you sure you want to delete resident with User ID: '${userId}'?`)) {
      const deleteUrl = `${this.residentBaseUrl}/DeleteUserProfileByUserId?userId=${encodeURIComponent(userId)}`;
      console.log(`Attempting to delete resident: ${userId}`);

      this.http.get<DeleteApiResponse>(deleteUrl).subscribe({
        next: (response) => {
          console.log('Delete API Response:', response);
          if (response.status === 200 && response.message === 'SUCCESS') {
            if (this.isBrowser) {
              alert(`Resident with User ID '${userId}' deleted successfully!`);
            }
            this.fetchResidents();
          } else {
            if (this.isBrowser) {
              alert(`Failed to delete resident: ${response.message || 'Unknown error'}`);
            }
          }
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error deleting resident:', error);
          if (this.isBrowser) {
            alert(`Failed to delete resident. Server error: ${error.message || 'Check console for details.'}`);
          }
        }
      });
    }
  }

  // MODIFY THIS METHOD: Fetches all resident profiles, populating both main list and dedicated tenant list
  fetchResidents(): void {
    this.http.get<GetAllUsersApiResponse>(`${this.residentBaseUrl}/GetAllUserProfile`).subscribe({
      next: (response) => {
        if (response.status === 200 && response.Data) {
          this.residentList = [];
          this.allTenants = [];

          const ownerFlatMap = new Map<string, string>();
          const ownerIdToNameMap = new Map<string, string>(); 
          const uniqueFlatNumbers = new Set<string>();


          if (Array.isArray(response.Data.owner)) {
            response.Data.owner.forEach(ownerItem => {
              ownerFlatMap.set(ownerItem.user_id, ownerItem.flat_number || '');
              ownerIdToNameMap.set(ownerItem.user_id, ownerItem.name || '');
              if (ownerItem.flat_number) {
                uniqueFlatNumbers.add(ownerItem.flat_number); // Add flat number to the set
              }
              this.residentList.push(this.mapApiItemToResidentProfile(ownerItem));
            });
          }

          // Convert the Set to an Array and sort it
          this.allAvailableFlatNumbers = Array.from(uniqueFlatNumbers).sort();
          console.log('All available flat numbers:', this.allAvailableFlatNumbers); // For debugging

          // Process tenants
          const tenantMap = new Map<string, ResidentProfile>();
          if (Array.isArray(response.Data.tenent)) {
            response.Data.tenent.forEach(item => {
              const mappedTenant = this.mapApiItemToResidentProfile(item);
              mappedTenant.owner_id = item.owner_id ? Number(item.owner_id) : undefined;
              if (item.owner_id && ownerIdToNameMap.has(item.owner_id)) {
                mappedTenant.ownerName = ownerIdToNameMap.get(item.owner_id); // ADD THIS LINE
              }
              this.allTenants.push(mappedTenant);
              tenantMap.set(mappedTenant.userId, mappedTenant);
            });
          }

          // Re-map residentList to include full tenant profiles if necessary (if owner data contains tenant details)
          if (Array.isArray(response.Data.owner)) {
            this.residentList = response.Data.owner.map(ownerItem => {
              const mappedOwner = this.mapApiItemToResidentProfile(ownerItem);
              if (mappedOwner.currentResident === 'Tenant' && tenantMap.has(mappedOwner.userId)) {
                const fullTenantProfile = tenantMap.get(mappedOwner.userId);
                if (fullTenantProfile) {
                  const mergedProfile: ResidentProfile = {
                    ...mappedOwner, 
                    id: fullTenantProfile.id, // Use tenant's ID if that's the primary ID for tenant operations
                    tenantName: fullTenantProfile.tenantName,
                    rentAgreement: fullTenantProfile.rentAgreement,
                    rentAgreementName: fullTenantProfile.rentAgreementName,
                    aadharCard: fullTenantProfile.aadharCard,
                    aadharCardName: fullTenantProfile.aadharCardName,
                    policeVerification: fullTenantProfile.policeVerification,
                    policeVerificationName: fullTenantProfile.policeVerificationName,
                    tenantContactNumber: fullTenantProfile.tenantContactNumber || mappedOwner.contactNumber, // Use tenant's contact, fallback to owner's
                    tenantAlternateContactNumber: fullTenantProfile.tenantAlternateContactNumber || mappedOwner.alternateContactNumber, // Use tenant's alt contact, fallback to owner's
                    isActive: fullTenantProfile.isActive,
                    fromDate: fullTenantProfile.fromDate,
                    toDate: fullTenantProfile.toDate,
                    currentResident: 'Tenant', // Explicitly set to Tenant for this merged profile
                    name: mappedOwner.name, // Keep the owner's name for consistency in the main list
                    userId: mappedOwner.userId, // Keep the owner's userId
                    flatNumber: mappedOwner.flatNumber, // Keep the owner's flat number
                    flatType: mappedOwner.flatType, // Keep the owner's flat type
                    carParking: mappedOwner.carParking, // Keep the owner's car parking status
                    numberOfCarParkingSlots: mappedOwner.numberOfCarParkingSlots, // Keep owner's car parking slots
                    maintenanceCharges: mappedOwner.maintenanceCharges, // Keep owner's maintenance charges
                    numberOfFamilyMembers: mappedOwner.numberOfFamilyMembers, 
                    ownerName: fullTenantProfile.ownerName,
                  };
                  console.log('Merged Tenant Profile (after fix):', mergedProfile);
                  return mergedProfile;
                }
              }
              return mappedOwner;
            });
          }

          this.applySearch();
          this.applyTenantSearch();

        } else {
          console.error('Failed to fetch residents:', response.message);
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error fetching residents:', error);
      }
    });
  }

  // MODIFY THIS METHOD: openFlatNumbersModal
  openFlatNumbersModal(): void {
    this.fetchResidents(); // This will refresh allAvailableFlatNumbers
    this.showFlatNumbersModal = true;
  }

  // MODIFY THIS METHOD: closeFlatNumbersModal
  closeFlatNumbersModal(): void {
    this.showFlatNumbersModal = false;
    this.selectedFlatFromModal = null;
  }

  // ADD THIS NEW METHOD:
  selectFlatNumber(flat: string): void {
    this.selectedFlatFromModal = flat; // Set the temporary selection
    this.tenantForm.get('flatNumber')?.setValue(flat); // Update the tenant form's flatNumber control
    this.tenantForm.get('flatNumber')?.markAsDirty(); // Mark as dirty
    this.tenantForm.get('flatNumber')?.markAsTouched(); // Mark as touched
    this.tenantForm.get('flatNumber')?.updateValueAndValidity(); // Update validity
    this.closeFlatNumbersModal(); // Close the modal
  }


  // Converts a File object to a Base64 string
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  // Marks all controls in a FormGroup as touched to trigger validation messages
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // --- Main Resident List (Owner/All) Logic ---
  applySearch(): void {
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
    this.filteredResidents = this.residentList.filter(resident => {
      const nameMatch = resident.name?.toLowerCase().includes(lowerCaseSearchTerm);
      const userIdMatch = resident.userId?.toLowerCase().includes(lowerCaseSearchTerm);
      const flatNumberMatch = resident.flatNumber?.toLowerCase().includes(lowerCaseSearchTerm);
      const userTypeMatch = resident.userType?.toLowerCase().includes(lowerCaseSearchTerm);
      const currentResidentMatch = resident.currentResident?.toLowerCase().includes(lowerCaseSearchTerm);
      const tenantNameMatch = resident.tenantName ? resident.tenantName.toLowerCase().includes(lowerCaseSearchTerm) : false;

      return nameMatch || userIdMatch || flatNumberMatch || userTypeMatch || currentResidentMatch || tenantNameMatch;
    });
    this.currentPage = 1;
    this.calculateTotalPages();
    this.paginateResidents();
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredResidents.length / this.itemsPerPage);
    this.pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      this.pages.push(i);
    }
  }

  paginateResidents(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedResidents = this.filteredResidents.slice(startIndex, endIndex);
  }

  getPages(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateResidents();
    }
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  // --- Tenant List Specific Logic ---
  get totalTenantPages(): number {
    return Math.ceil(this.filteredTenants.length / this.tenantItemsPerPage);
  }

  getTenantPages(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.tenantCurrentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalTenantPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToTenantPage(page: number): void {
    if (page < 1 || page > this.totalTenantPages) return;
    this.tenantCurrentPage = page;
    this.updatePaginatedTenants();
  }

  applyTenantSearch(): void {
    const term = this.tenantSearchTerm.toLowerCase();
    this.filteredTenants = this.allTenants.filter(t =>
      (t.tenantName || '').toLowerCase().includes(term) ||
      (t.tenantContactNumber || '').toLowerCase().includes(term) ||
      (t.flatNumber || '').toLowerCase().includes(term)
    );
    this.tenantCurrentPage = 1;
    this.updatePaginatedTenants();
  }

  updatePaginatedTenants(): void {
    const start = (this.tenantCurrentPage - 1) * this.tenantItemsPerPage;
    const end = start + this.tenantItemsPerPage;
    this.paginatedTenants = this.filteredTenants.slice(start, end);
  }
}