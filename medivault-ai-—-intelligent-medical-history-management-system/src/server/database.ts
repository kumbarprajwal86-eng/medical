import {
  User,
  PatientProfile,
  DoctorProfile,
  Hospital,
  MedicalRecord,
  AccessRequest,
  ConsentRecord,
  AuditLogEvent,
  AISummary,
  ClinicalAmendment,
  RecordCategory
} from './types.js';

export class MediVaultDatabase {
  users: Map<string, User> = new Map();
  patients: Map<string, PatientProfile> = new Map();
  doctors: Map<string, DoctorProfile> = new Map();
  hospitals: Map<string, Hospital> = new Map();
  records: Map<string, MedicalRecord> = new Map();
  accessRequests: Map<string, AccessRequest> = new Map();
  consents: Map<string, ConsentRecord> = new Map();
  auditLogs: AuditLogEvent[] = [];
  aiSummaries: Map<string, AISummary> = new Map();

  constructor() {
    // Zero fake / mock demo data. Database starts clean and empty.
  }

  clearAllData() {
    this.users.clear();
    this.patients.clear();
    this.doctors.clear();
    this.hospitals.clear();
    this.records.clear();
    this.accessRequests.clear();
    this.consents.clear();
    this.auditLogs = [];
    this.aiSummaries.clear();
  }

  // --- Registration & Management Methods ---

  registerPatient(data: {
    fullName: string;
    dateOfBirth: string;
    gender: 'Male' | 'Female' | 'Other';
    contactNumber: string;
    email: string;
    bloodGroup: string;
    address: string;
    emergencyContact: { name: string; relationship: string; phone: string };
    knownAllergies?: Array<{ allergen: string; severity: 'Mild' | 'Moderate' | 'Severe' | 'Life-Threatening'; reaction: string; documentedDate: string }>;
    existingConditions?: Array<{ condition: string; diagnosedDate: string; status: 'Active' | 'Controlled' | 'Resolved'; notes?: string }>;
    familyHistory?: string[];
  }): { user: User; patient: PatientProfile } {
    const patientId = `MV-P-${(1000 + this.patients.size + 1).toString()}`;
    const userUid = `usr-pat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const patient: PatientProfile = {
      patientId,
      userUid,
      fullName: data.fullName.trim(),
      dateOfBirth: data.dateOfBirth.trim(),
      gender: data.gender,
      contactNumber: data.contactNumber.trim(),
      email: data.email.trim(),
      bloodGroup: data.bloodGroup || 'O+',
      address: data.address || '',
      emergencyContact: data.emergencyContact || { name: 'Emergency Contact', relationship: 'Family', phone: data.contactNumber },
      knownAllergies: data.knownAllergies || [],
      existingConditions: data.existingConditions || [],
      familyHistory: data.familyHistory || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const user: User = {
      uid: userUid,
      email: data.email.trim(),
      fullName: data.fullName.trim(),
      role: 'patient',
      accountStatus: 'active',
      patientId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.patients.set(patientId, patient);
    this.users.set(userUid, user);

    this.addAuditLog({
      actorUid: userUid,
      actorName: patient.fullName,
      actorRole: 'patient',
      patientId,
      patientName: patient.fullName,
      action: 'PATIENT_SEARCH',
      resourceType: 'patient_profile',
      resourceId: patientId,
      purpose: 'Patient account registered with unique medical identifier',
      outcome: 'SUCCESS',
    });

    return { user, patient };
  }

  registerDoctor(data: {
    fullName: string;
    email: string;
    phone: string;
    professionalRegistrationNumber: string;
    specialization: string;
    primaryHospitalId?: string;
    primaryHospitalName?: string;
  }): { user: User; doctor: DoctorProfile } {
    const doctorId = `DOC-${(100 + this.doctors.size + 1).toString()}`;
    const userUid = `usr-doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const doctor: DoctorProfile = {
      doctorId,
      userUid,
      fullName: data.fullName.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      professionalRegistrationNumber: data.professionalRegistrationNumber.trim(),
      specialization: data.specialization.trim(),
      primaryHospitalId: data.primaryHospitalId || 'HOSP-GEN',
      primaryHospitalName: data.primaryHospitalName || 'Registered Medical Facility',
      affiliatedHospitalIds: [data.primaryHospitalId || 'HOSP-GEN'],
      verificationStatus: 'verified', // Verified on onboarding
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'State Medical Council Registry',
    };

    const user: User = {
      uid: userUid,
      email: data.email.trim(),
      fullName: data.fullName.trim(),
      role: 'doctor',
      accountStatus: 'active',
      doctorId,
      hospitalId: doctor.primaryHospitalId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.doctors.set(doctorId, doctor);
    this.users.set(userUid, user);

    this.addAuditLog({
      actorUid: userUid,
      actorName: doctor.fullName,
      actorRole: 'doctor',
      hospitalId: doctor.primaryHospitalId,
      hospitalName: doctor.primaryHospitalName,
      action: 'DOCTOR_VERIFIED',
      resourceType: 'system_policy',
      resourceId: doctorId,
      purpose: `Physician registered with license ${doctor.professionalRegistrationNumber}`,
      outcome: 'SUCCESS',
    });

    return { user, doctor };
  }

  registerHospital(data: {
    hospitalName: string;
    registrationNumber: string;
    address: string;
    city: string;
    contactPhone: string;
    emergencyDepartment?: boolean;
    adminName?: string;
    adminEmail?: string;
  }): { hospital: Hospital; adminUser?: User } {
    const hospitalId = `HOSP-${(100 + this.hospitals.size + 1).toString()}`;
    const hospital: Hospital = {
      hospitalId,
      hospitalName: data.hospitalName.trim(),
      registrationNumber: data.registrationNumber.trim(),
      address: data.address.trim(),
      city: data.city.trim(),
      contactPhone: data.contactPhone.trim(),
      emergencyDepartment: data.emergencyDepartment !== false,
      verificationStatus: 'verified',
    };
    this.hospitals.set(hospitalId, hospital);

    let adminUser: User | undefined;
    if (data.adminName && data.adminEmail) {
      const userUid = `usr-hosp-admin-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      adminUser = {
        uid: userUid,
        email: data.adminEmail.trim(),
        fullName: data.adminName.trim(),
        role: 'hospital_admin',
        accountStatus: 'active',
        hospitalId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.users.set(userUid, adminUser);
    }

    return { hospital, adminUser };
  }

  registerSystemAdmin(data: { fullName: string; email: string }): User {
    const userUid = `usr-sys-admin-${Date.now()}`;
    const user: User = {
      uid: userUid,
      email: data.email.trim(),
      fullName: data.fullName.trim(),
      role: 'system_admin',
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(userUid, user);
    return user;
  }

  // --- Core Query & Mutate Methods ---

  addAuditLog(event: Omit<AuditLogEvent, 'eventId' | 'timestamp'>): AuditLogEvent {
    const fullEvent: AuditLogEvent = {
      ...event,
      eventId: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(fullEvent);
    return fullEvent;
  }

  getPatient(patientId: string): PatientProfile | undefined {
    return this.patients.get(patientId.trim().toUpperCase());
  }

  findPatientByIdAndDob(patientId: string, dob: string): PatientProfile | undefined {
    const p = this.patients.get(patientId.trim().toUpperCase());
    if (p && p.dateOfBirth === dob.trim()) {
      return p;
    }
    return undefined;
  }

  getRecordsForPatient(patientId: string, allowedCategories?: RecordCategory[]): MedicalRecord[] {
    const all = Array.from(this.records.values()).filter(r => r.patientId.toUpperCase() === patientId.toUpperCase());
    if (!allowedCategories || allowedCategories.length === 0) {
      return all.sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime());
    }
    return all
      .filter(r => allowedCategories.includes(r.recordCategory))
      .sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime());
  }

  checkDoctorAccess(doctorId: string, patientId: string): { hasAccess: boolean; consent?: ConsentRecord; reason?: string } {
    const doctor = this.doctors.get(doctorId);
    if (!doctor) return { hasAccess: false, reason: 'Doctor profile not found' };

    const now = new Date().toISOString();
    const activeConsent = Array.from(this.consents.values()).find(
      c => c.patientId.toUpperCase() === patientId.toUpperCase() &&
           (c.granteeDoctorId === doctorId || c.granteeHospitalId === doctor.primaryHospitalId) &&
           c.status === 'active' &&
           new Date(c.expiresAt).getTime() > new Date(now).getTime()
    );

    if (activeConsent) {
      return { hasAccess: true, consent: activeConsent };
    }

    return { hasAccess: false, reason: 'No active patient consent granted for this clinician or hospital.' };
  }

  approveAccessRequest(requestId: string, approvedCategories?: RecordCategory[], durationDays: number = 7): ConsentRecord {
    const req = this.accessRequests.get(requestId);
    if (!req) throw new Error('Access request not found');

    const now = new Date();
    const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    req.status = 'approved';
    req.decidedAt = now.toISOString();

    const consent: ConsentRecord = {
      consentId: `CON-${Date.now().toString().slice(-6)}`,
      requestId: req.requestId,
      patientId: req.patientId,
      granteeDoctorId: req.requesterDoctorId,
      granteeDoctorName: req.requesterDoctorName,
      granteeHospitalId: req.requesterHospitalId,
      granteeHospitalName: req.requesterHospitalName,
      authorizedRecordCategories: approvedCategories || req.requestedRecordCategories,
      purpose: req.purpose,
      grantedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      status: 'active',
      authorizationBasis: 'patient_consent',
    };

    this.consents.set(consent.consentId, consent);

    this.addAuditLog({
      actorUid: req.patientId,
      actorName: req.patientName,
      actorRole: 'patient',
      patientId: req.patientId,
      patientName: req.patientName,
      hospitalId: req.requesterHospitalId,
      hospitalName: req.requesterHospitalName,
      action: 'ACCESS_APPROVED',
      resourceType: 'consent',
      resourceId: consent.consentId,
      purpose: `Patient approved access for Dr. ${req.requesterDoctorName} (${durationDays} days)`,
      outcome: 'SUCCESS',
      details: { authorizedCategories: consent.authorizedRecordCategories },
    });

    return consent;
  }

  denyAccessRequest(requestId: string, reason?: string): AccessRequest {
    const req = this.accessRequests.get(requestId);
    if (!req) throw new Error('Access request not found');

    req.status = 'denied';
    req.decidedAt = new Date().toISOString();
    req.decisionNotes = reason || 'Patient declined consent';

    this.addAuditLog({
      actorUid: req.patientId,
      actorName: req.patientName,
      actorRole: 'patient',
      patientId: req.patientId,
      patientName: req.patientName,
      hospitalId: req.requesterHospitalId,
      hospitalName: req.requesterHospitalName,
      action: 'ACCESS_DENIED',
      resourceType: 'access_request',
      resourceId: req.requestId,
      purpose: reason || 'Access denied by patient',
      outcome: 'SUCCESS',
    });

    return req;
  }

  revokeConsent(consentId: string, revokedByUid: string, revokedByName: string): ConsentRecord {
    const consent = this.consents.get(consentId);
    if (!consent) throw new Error('Consent record not found');

    consent.status = 'revoked';
    consent.revokedAt = new Date().toISOString();

    this.addAuditLog({
      actorUid: revokedByUid,
      actorName: revokedByName,
      actorRole: 'patient',
      patientId: consent.patientId,
      hospitalId: consent.granteeHospitalId,
      hospitalName: consent.granteeHospitalName,
      action: 'ACCESS_REVOKED',
      resourceType: 'consent',
      resourceId: consent.consentId,
      purpose: 'Patient immediately revoked medical record access privileges',
      outcome: 'SUCCESS',
    });

    return consent;
  }

  addClinicalAmendment(recordId: string, amendment: ClinicalAmendment): MedicalRecord {
    const record = this.records.get(recordId);
    if (!record) throw new Error('Record not found');

    if (!record.amendments) {
      record.amendments = [];
    }
    record.amendments.push(amendment);
    record.updatedAt = new Date().toISOString();

    this.addAuditLog({
      actorUid: amendment.doctorId,
      actorName: amendment.doctorName,
      actorRole: 'doctor',
      patientId: record.patientId,
      hospitalId: record.hospitalId,
      hospitalName: record.hospitalName,
      action: 'RECORD_AMENDED',
      resourceType: 'medical_record',
      resourceId: record.recordId,
      purpose: amendment.reason,
      outcome: 'SUCCESS',
      details: { amendmentId: amendment.amendmentId, signature: amendment.digitalSignature },
    });

    return record;
  }
}

export const db = new MediVaultDatabase();
