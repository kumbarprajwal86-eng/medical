export type UserRole = 'patient' | 'doctor' | 'hospital_admin' | 'system_admin';

export interface User {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  accountStatus: 'active' | 'suspended' | 'pending_verification';
  patientId?: string;
  doctorId?: string;
  hospitalId?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientProfile {
  patientId: string;
  userUid: string;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'Male' | 'Female' | 'Other';
  contactNumber: string;
  email: string;
  bloodGroup: string;
  address: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  knownAllergies: Array<{
    allergen: string;
    severity: 'Mild' | 'Moderate' | 'Severe' | 'Life-Threatening';
    reaction: string;
    documentedDate: string;
  }>;
  existingConditions: Array<{
    condition: string;
    diagnosedDate: string;
    status: 'Active' | 'Controlled' | 'Resolved';
    notes?: string;
  }>;
  familyHistory?: string[];
  lifestyleFactors?: {
    smoking: 'Never' | 'Former' | 'Current';
    alcohol: 'Never' | 'Occasional' | 'Regular';
    activityLevel: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DoctorProfile {
  doctorId: string;
  userUid: string;
  fullName: string;
  email: string;
  phone: string;
  professionalRegistrationNumber: string; // Medical Council License
  specialization: string;
  primaryHospitalId: string;
  primaryHospitalName: string;
  affiliatedHospitalIds: string[];
  verificationStatus: 'verified' | 'pending' | 'rejected' | 'suspended';
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface Hospital {
  hospitalId: string;
  hospitalName: string;
  registrationNumber: string;
  address: string;
  city: string;
  contactPhone: string;
  emergencyDepartment: boolean;
  verificationStatus: 'verified' | 'pending';
}

export type RecordCategory = 
  | 'consultation'
  | 'prescription'
  | 'lab_investigation'
  | 'discharge_summary'
  | 'surgical_record'
  | 'radiology_imaging'
  | 'vaccination';

export interface MedicationItem {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string; // Oral, IV, Topical, etc.
  startDate: string;
  endDate?: string;
  instructions: string;
  status: 'active' | 'completed' | 'discontinued';
  prescribingDoctor: string;
}

export interface LabResultItem {
  testName: string;
  result: string | number;
  unit: string;
  referenceRange: string;
  flag?: 'normal' | 'high' | 'low' | 'critical' | 'unspecified';
  clinicalInterpretation?: string;
}

export interface ClinicalAmendment {
  amendmentId: string;
  doctorId: string;
  doctorName: string;
  timestamp: string;
  reason: string;
  amendedFieldsDescription: string;
  digitalSignature: string;
}

export interface MedicalRecord {
  recordId: string;
  patientId: string;
  hospitalId: string;
  hospitalName: string;
  createdById: string;
  createdByName: string;
  createdByRole: 'doctor' | 'patient' | 'hospital_staff';
  recordCategory: RecordCategory;
  recordDate: string; // ISO date YYYY-MM-DD
  title: string;
  department: string;
  presentingComplaint?: string;
  examinationFindings?: string;
  clinicianDiagnosis?: string;
  treatmentAndFollowUpPlan?: string;
  medications?: MedicationItem[];
  labResults?: LabResultItem[];
  dischargeStatus?: string;
  surgicalProcedure?: string;
  documentUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  sourceDocumentMetadata?: {
    originalFileName: string;
    fileSizeKB: number;
    uploadedAt: string;
    hashSHA256: string;
    isScannedDocument: boolean;
  };
  amendments?: ClinicalAmendment[];
  verificationStatus: 'verified_by_clinician' | 'patient_submitted' | 'pending_verification';
  createdAt: string;
  updatedAt: string;
}

export interface AccessRequest {
  requestId: string;
  patientId: string;
  patientName: string;
  requesterDoctorId: string;
  requesterDoctorName: string;
  requesterHospitalId: string;
  requesterHospitalName: string;
  purpose: string;
  requestedRecordCategories: RecordCategory[];
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  expiresAt: string;
  decisionNotes?: string;
  decidedAt?: string;
}

export interface ConsentRecord {
  consentId: string;
  requestId?: string;
  patientId: string;
  granteeDoctorId: string;
  granteeDoctorName: string;
  granteeHospitalId: string;
  granteeHospitalName: string;
  authorizedRecordCategories: RecordCategory[];
  purpose: string;
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string;
  status: 'active' | 'revoked' | 'expired';
  authorizationBasis: 'patient_consent' | 'emergency_statutory_protocol';
}

export interface AuditLogEvent {
  eventId: string;
  actorUid: string;
  actorName: string;
  actorRole: UserRole;
  patientId?: string;
  patientName?: string;
  hospitalId?: string;
  hospitalName?: string;
  action: 
    | 'PATIENT_SEARCH'
    | 'ACCESS_REQUESTED'
    | 'ACCESS_APPROVED'
    | 'ACCESS_DENIED'
    | 'ACCESS_REVOKED'
    | 'RECORD_VIEWED'
    | 'RECORD_CREATED'
    | 'RECORD_AMENDED'
    | 'RECORD_DOWNLOADED'
    | 'AI_SUMMARY_GENERATED'
    | 'AI_SEARCH_PERFORMED'
    | 'DOCUMENT_OCR_EXTRACTED'
    | 'DOCTOR_VERIFIED'
    | 'SECURITY_ALERT';
  resourceType: 'medical_record' | 'patient_profile' | 'consent' | 'access_request' | 'system_policy';
  resourceId: string;
  purpose: string;
  timestamp: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FLAGGED';
  details?: Record<string, any>;
}

export interface AISummary {
  summaryId: string;
  patientId: string;
  generatedById: string;
  generatedByName: string;
  generatedAt: string;
  modelVersion: string;
  sourceRecordIds: string[];
  summaryContent: {
    baselineDemographics: string;
    pastConditions: string[];
    hospitalVisits: string[];
    currentMedications: Array<{ medication: string; dosage: string; sourceRecordId: string }>;
    historicalMedications: Array<{ medication: string; sourceRecordId: string; status: string }>;
    documentedAllergies: string[];
    keyInvestigations: Array<{ test: string; result: string; date: string; sourceRecordId: string }>;
    surgicalHistory: string[];
    followUpPlan: string;
    dataGapsAndConflicts: string[];
  };
  reviewStatus: 'pending_doctor_review' | 'confirmed_by_doctor';
  reviewedByDoctorId?: string;
  reviewedAt?: string;
}
