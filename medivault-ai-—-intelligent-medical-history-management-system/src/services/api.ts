import {
  MedicalRecord,
  PatientProfile,
  DoctorProfile,
  AccessRequest,
  ConsentRecord,
  AuditLogEvent,
  AISummary,
  RecordCategory
} from '../server/types.js';

export interface Persona {
  uid: string;
  name: string;
  role: 'patient' | 'doctor' | 'hospital_admin' | 'system_admin';
  patientId?: string;
  doctorId?: string;
  hospitalName?: string;
  subtitle: string;
  avatar: string;
}

export const api = {
  // Auth & Personas
  async getPersonas(): Promise<Persona[]> {
    const res = await fetch('/api/auth/personas');
    const data = await res.json();
    return data.personas || [];
  },

  async login(uid: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    return res.json();
  },

  async register(data: any) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async clearAllData() {
    const res = await fetch('/api/admin/clear-all', {
      method: 'POST',
    });
    return res.json();
  },

  async getHospitals() {
    const res = await fetch('/api/hospitals');
    return res.json();
  },

  async registerHospital(data: any) {
    const res = await fetch('/api/hospitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Patients
  async getPatients(): Promise<any[]> {
    const res = await fetch('/api/patients');
    const data = await res.json();
    return data.patients || [];
  },

  async searchPatient(id: string, dob?: string, requesterDoctorId?: string) {
    const params = new URLSearchParams({ id });
    if (dob) params.append('dob', dob);
    if (requesterDoctorId) params.append('requesterDoctorId', requesterDoctorId);

    const res = await fetch(`/api/patients/search?${params.toString()}`);
    return res.json();
  },

  async getPatient(patientId: string): Promise<PatientProfile | null> {
    const res = await fetch(`/api/patients/${patientId}`);
    const data = await res.json();
    return data.patient || null;
  },

  async getTimeline(patientId: string, doctorId?: string) {
    const params = doctorId ? `?doctorId=${doctorId}` : '';
    const res = await fetch(`/api/patients/${patientId}/timeline${params}`);
    return res.json();
  },

  // Medical Records
  async getRecords(patientId: string, doctorId?: string): Promise<{ success: boolean; records?: MedicalRecord[]; error?: string; consentRequired?: boolean }> {
    const params = doctorId ? `?doctorId=${doctorId}` : '';
    const res = await fetch(`/api/patients/${patientId}/records${params}`);
    return res.json();
  },

  async createRecord(recordData: Partial<MedicalRecord>) {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recordData),
    });
    return res.json();
  },

  async addAmendment(recordId: string, data: { doctorId: string; doctorName: string; reason: string; amendedFieldsDescription: string }) {
    const res = await fetch(`/api/records/${recordId}/amendments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Access Requests & Consents
  async getAccessRequests(patientId?: string, doctorId?: string): Promise<AccessRequest[]> {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    if (doctorId) params.append('doctorId', doctorId);
    const res = await fetch(`/api/access-requests?${params.toString()}`);
    const data = await res.json();
    return data.requests || [];
  },

  async requestAccess(data: { patientId: string; doctorId: string; purpose: string; requestedCategories: RecordCategory[] }) {
    const res = await fetch('/api/access-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async approveAccess(requestId: string, approvedCategories?: RecordCategory[], durationDays: number = 7) {
    const res = await fetch(`/api/access-requests/${requestId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvedCategories, durationDays }),
    });
    return res.json();
  },

  async denyAccess(requestId: string, reason?: string) {
    const res = await fetch(`/api/access-requests/${requestId}/deny`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return res.json();
  },

  async getConsents(patientId: string): Promise<ConsentRecord[]> {
    const res = await fetch(`/api/consents/patient/${patientId}`);
    const data = await res.json();
    return data.consents || [];
  },

  async revokeConsent(consentId: string, revokedByUid: string, revokedByName: string) {
    const res = await fetch(`/api/consents/${consentId}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revokedByUid, revokedByName }),
    });
    return res.json();
  },

  // AI Services
  async generateSummary(patientId: string, doctorId: string) {
    const res = await fetch('/api/ai/summarize-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, doctorId }),
    });
    return res.json();
  },

  async confirmSummary(summaryId: string, doctorId: string) {
    const res = await fetch(`/api/ai/summaries/${summaryId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId }),
    });
    return res.json();
  },

  async searchRecordsNL(patientId: string, question: string, doctorId?: string) {
    const res = await fetch('/api/ai/search-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, question, doctorId }),
    });
    return res.json();
  },

  async extractDocument(data: { documentBase64?: string; documentText?: string; mimeType?: string; isImage?: boolean }) {
    const res = await fetch('/api/ai/extract-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async compareResults(patientId: string, testName: string, doctorId?: string) {
    const res = await fetch('/api/ai/compare-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, testName, doctorId }),
    });
    return res.json();
  },

  async explainRecord(recordId: string) {
    const res = await fetch('/api/ai/explain-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId }),
    });
    return res.json();
  },

  // Admin
  async getAdminStats() {
    const res = await fetch('/api/admin/statistics');
    return res.json();
  },

  async getAuditLogs(filter?: { patientId?: string; hospitalId?: string; action?: string }): Promise<AuditLogEvent[]> {
    const params = new URLSearchParams();
    if (filter?.patientId) params.append('patientId', filter.patientId);
    if (filter?.hospitalId) params.append('hospitalId', filter.hospitalId);
    if (filter?.action) params.append('action', filter.action);

    const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
    const data = await res.json();
    return data.logs || [];
  },

  async verifyDoctor(doctorId: string, status: string = 'verified') {
    const res = await fetch(`/api/admin/doctors/${doctorId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, verifiedBy: 'Chief Credentialing Officer' }),
    });
    return res.json();
  },
};
