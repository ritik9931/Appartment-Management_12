// src/app/models/resident.model.ts

export interface ResidentProfile {
    userId: string;
    password?: string; // Optional for viewing maybe?
    name: string;
    userType: 'Owner' | 'Tenant';
    designation?: string; // Might be relevant for service engineers later
    contactNumber: string;
    emailAddress: string;
    alternateContactNumber?: string;
    numberOfFamilyMembers?: number;
    flatNumber: string;
    flatType: '1BHK' | '2BHK' | '3BHK';
    carParking: boolean;
    numberOfCarParkingSlots: number;
    maintenanceCharges?: number; // Might be relevant later
    currentResident: 'Owner' | 'Tenant';
    // Tenant Specific Fields
    tenantName?: string;
    rentAgreement?: File | null; // For file uploads
    aadharCard?: File | null;
    policeVerification?: File | null;
    tenantContactNumber?: string;
    tenantAlternateContactNumber?: string;
    isActive?: boolean;
    saleDeedDoc?: File | null; // From your screenshot
  }