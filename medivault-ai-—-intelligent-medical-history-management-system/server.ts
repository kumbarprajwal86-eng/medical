import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './src/server/database.js';
import {
  generateClinicalSummary,
  searchRecordsNaturalLanguage,
  extractDocumentData,
  compareClinicalResults,
  explainMedicalRecordForPatient
} from './src/server/gemini.js';
import { RecordCategory, UserRole } from './src/server/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Increase payload limit for base64 medical documents / reports
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Request logging & Audit middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  // ==========================================
  // AUTHENTICATION & DYNAMIC REGISTERED ACCOUNTS
  // ==========================================

  app.get('/api/auth/personas', (req: Request, res: Response) => {
    const personas = Array.from(db.users.values()).map(u => {
      let hospitalName: string | undefined;
      let extraSubtitle = '';

      if (u.role === 'patient' && u.patientId) {
        const p = db.patients.get(u.patientId);
        extraSubtitle = p ? `Patient (${p.patientId}) · Blood: ${p.bloodGroup}` : `Patient (${u.patientId})`;
      } else if (u.role === 'doctor' && u.doctorId) {
        const d = db.doctors.get(u.doctorId);
        hospitalName = d?.primaryHospitalName;
        extraSubtitle = d ? `${d.specialization} · Lic: ${d.professionalRegistrationNumber}` : `Doctor (${u.doctorId})`;
      } else if (u.role === 'hospital_admin' && u.hospitalId) {
        const h = db.hospitals.get(u.hospitalId);
        hospitalName = h?.hospitalName;
        extraSubtitle = `Hospital Administrator (${hospitalName || u.hospitalId})`;
      } else {
        extraSubtitle = 'System Compliance & Security Auditor';
      }

      const initials = u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

      return {
        uid: u.uid,
        name: u.fullName,
        role: u.role,
        patientId: u.patientId,
        doctorId: u.doctorId,
        hospitalName,
        subtitle: extraSubtitle,
        avatar: initials,
      };
    });

    res.json({ success: true, personas });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { role, ...data } = req.body;

    try {
      if (role === 'patient') {
        const result = db.registerPatient({
          fullName: data.fullName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender || 'Other',
          contactNumber: data.contactNumber || '',
          email: data.email || '',
          bloodGroup: data.bloodGroup || 'O+',
          address: data.address || '',
          emergencyContact: data.emergencyContact || { name: data.emergencyContactName || 'Family Contact', relationship: 'Relative', phone: data.emergencyContactPhone || '' },
          knownAllergies: data.knownAllergies || [],
          existingConditions: data.existingConditions || [],
        });
        return res.json({ success: true, user: result.user, profile: result.patient });
      }

      if (role === 'doctor') {
        const result = db.registerDoctor({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone || '',
          professionalRegistrationNumber: data.professionalRegistrationNumber,
          specialization: data.specialization || 'General Medicine',
          primaryHospitalId: data.primaryHospitalId,
          primaryHospitalName: data.primaryHospitalName,
        });
        return res.json({ success: true, user: result.user, profile: result.doctor });
      }

      if (role === 'hospital_admin') {
        const result = db.registerHospital({
          hospitalName: data.hospitalName,
          registrationNumber: data.registrationNumber || `REG-${Date.now().toString().slice(-5)}`,
          address: data.address || 'Medical Center Way',
          city: data.city || 'Central City',
          contactPhone: data.contactPhone || '',
          adminName: data.fullName,
          adminEmail: data.email,
        });
        return res.json({ success: true, user: result.adminUser, hospital: result.hospital });
      }

      if (role === 'system_admin') {
        const user = db.registerSystemAdmin({
          fullName: data.fullName || 'System Auditor',
          email: data.email || 'compliance@medivault.local',
        });
        return res.json({ success: true, user });
      }

      return res.status(400).json({ success: false, error: 'Invalid user role specified' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/clear-all', (req: Request, res: Response) => {
    db.clearAllData();
    res.json({ success: true, message: 'All records and user accounts cleared.' });
  });

  app.get('/api/hospitals', (req: Request, res: Response) => {
    res.json({ success: true, hospitals: Array.from(db.hospitals.values()) });
  });

  app.post('/api/hospitals', (req: Request, res: Response) => {
    const { hospitalName, registrationNumber, address, city, contactPhone, emergencyDepartment } = req.body;
    if (!hospitalName) return res.status(400).json({ success: false, error: 'Hospital name is required' });

    const result = db.registerHospital({
      hospitalName,
      registrationNumber: registrationNumber || `REG-${Date.now().toString().slice(-4)}`,
      address: address || '',
      city: city || '',
      contactPhone: contactPhone || '',
      emergencyDepartment: emergencyDepartment !== false,
    });
    res.json({ success: true, hospital: result.hospital });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { uid } = req.body;
    const user = db.users.get(uid);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found' });
    }

    let extraProfile: any = null;
    if (user.role === 'patient' && user.patientId) {
      extraProfile = db.patients.get(user.patientId);
    } else if (user.role === 'doctor' && user.doctorId) {
      extraProfile = db.doctors.get(user.doctorId);
    }

    db.addAuditLog({
      actorUid: user.uid,
      actorName: user.fullName,
      actorRole: user.role,
      patientId: user.patientId,
      hospitalId: user.hospitalId,
      action: 'PATIENT_SEARCH',
      resourceType: 'system_policy',
      resourceId: user.uid,
      purpose: 'User authenticated into MediVault AI session',
      outcome: 'SUCCESS',
    });

    res.json({
      success: true,
      user,
      profile: extraProfile,
    });
  });

  // ==========================================
  // PATIENTS & IDENTITY MATCHING
  // ==========================================

  app.get('/api/patients', (req: Request, res: Response) => {
    const list = Array.from(db.patients.values()).map(p => ({
      patientId: p.patientId,
      fullName: p.fullName,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      bloodGroup: p.bloodGroup,
      existingConditions: p.existingConditions.map(c => c.condition),
      allergiesCount: p.knownAllergies.length,
    }));
    res.json({ success: true, patients: list });
  });

  // Secure identity matching: Patient ID + Date of Birth verification
  app.get('/api/patients/search', (req: Request, res: Response) => {
    const { id, dob, requesterDoctorId } = req.query as { id?: string; dob?: string; requesterDoctorId?: string };

    if (!id) {
      return res.status(400).json({ success: false, error: 'Patient ID is required for secure matching' });
    }

    const patient = db.patients.get(id.trim().toUpperCase());
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'No patient profile matched the provided Patient ID. Please verify with patient official ID card.',
      });
    }

    // Require Date of Birth verification to prevent casual or speculative lookups
    const isDobVerified = dob ? patient.dateOfBirth === dob.trim() : false;

    if (requesterDoctorId) {
      const doctor = db.doctors.get(requesterDoctorId);
      db.addAuditLog({
        actorUid: requesterDoctorId,
        actorName: doctor ? doctor.fullName : 'Doctor',
        actorRole: 'doctor',
        patientId: patient.patientId,
        patientName: patient.fullName,
        hospitalId: doctor?.primaryHospitalId,
        hospitalName: doctor?.primaryHospitalName,
        action: 'PATIENT_SEARCH',
        resourceType: 'patient_profile',
        resourceId: patient.patientId,
        purpose: 'Cross-hospital patient identification verification',
        outcome: isDobVerified ? 'SUCCESS' : 'FLAGGED',
      });
    }

    if (!isDobVerified) {
      return res.json({
        success: true,
        matched: false,
        requiresDobVerification: true,
        patientId: patient.patientId,
        message: 'Patient found in national registry. Please confirm Date of Birth to proceed with clinical access.',
      });
    }

    // Check doctor access consent
    let accessStatus: { hasAccess: boolean; consent?: any; reason?: string } = { hasAccess: false, reason: 'Consent required' };
    if (requesterDoctorId) {
      accessStatus = db.checkDoctorAccess(requesterDoctorId, patient.patientId);
    }

    res.json({
      success: true,
      matched: true,
      patient: {
        patientId: patient.patientId,
        fullName: patient.fullName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        emergencyContact: patient.emergencyContact,
        knownAllergies: patient.knownAllergies,
      },
      accessStatus,
    });
  });

  app.get('/api/patients/:patientId', (req: Request, res: Response) => {
    const patient = db.getPatient(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }
    res.json({ success: true, patient });
  });

  // Chronological clinical timeline
  app.get('/api/patients/:patientId/timeline', (req: Request, res: Response) => {
    const { patientId } = req.params;
    const { doctorId } = req.query as { doctorId?: string };

    const patient = db.getPatient(patientId);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    let allowedCategories: RecordCategory[] | undefined;
    if (doctorId) {
      const access = db.checkDoctorAccess(doctorId, patientId);
      if (!access.hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Patient consent is required before viewing medical history timeline.',
        });
      }
      allowedCategories = access.consent?.authorizedRecordCategories;
    }

    const records = db.getRecordsForPatient(patientId, allowedCategories);

    const timelineEvents = records.map(r => ({
      id: r.recordId,
      date: r.recordDate,
      category: r.recordCategory,
      title: r.title,
      hospitalName: r.hospitalName,
      createdByName: r.createdByName,
      diagnosis: r.clinicianDiagnosis,
      medicationsCount: r.medications?.length || 0,
      labsCount: r.labResults?.length || 0,
      hasScannedDocument: !!r.sourceDocumentMetadata?.isScannedDocument,
      verificationStatus: r.verificationStatus,
    }));

    res.json({ success: true, patient, timeline: timelineEvents });
  });

  // ==========================================
  // MEDICAL RECORDS & PERMISSIONS
  // ==========================================

  app.get('/api/patients/:patientId/records', (req: Request, res: Response) => {
    const { patientId } = req.params;
    const { doctorId } = req.query as { doctorId?: string };

    const patient = db.getPatient(patientId);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    let allowedCategories: RecordCategory[] | undefined;
    if (doctorId) {
      const access = db.checkDoctorAccess(doctorId, patientId);
      if (!access.hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You do not hold active patient consent to inspect these clinical records.',
          consentRequired: true,
        });
      }
      allowedCategories = access.consent?.authorizedRecordCategories;

      const doctor = db.doctors.get(doctorId);
      db.addAuditLog({
        actorUid: doctorId,
        actorName: doctor ? doctor.fullName : 'Doctor',
        actorRole: 'doctor',
        patientId,
        patientName: patient.fullName,
        hospitalId: doctor?.primaryHospitalId,
        hospitalName: doctor?.primaryHospitalName,
        action: 'RECORD_VIEWED',
        resourceType: 'medical_record',
        resourceId: `ALL_PATIENT_RECORDS_${patientId}`,
        purpose: 'Authorized review of patient clinical records under active consent',
        outcome: 'SUCCESS',
      });
    }

    const records = db.getRecordsForPatient(patientId, allowedCategories);
    res.json({ success: true, records });
  });

  app.get('/api/records/:recordId', (req: Request, res: Response) => {
    const record = db.records.get(req.params.recordId);
    if (!record) return res.status(404).json({ success: false, error: 'Medical record not found' });
    res.json({ success: true, record });
  });

  app.post('/api/records', (req: Request, res: Response) => {
    const {
      patientId,
      hospitalId,
      hospitalName,
      createdById,
      createdByName,
      createdByRole,
      recordCategory,
      recordDate,
      title,
      department,
      presentingComplaint,
      examinationFindings,
      clinicianDiagnosis,
      treatmentAndFollowUpPlan,
      medications,
      labResults,
      dischargeStatus,
      surgicalProcedure,
      sourceDocumentMetadata,
    } = req.body;

    if (!patientId || !title || !recordCategory) {
      return res.status(400).json({ success: false, error: 'Missing mandatory record fields' });
    }

    const recordId = `REC-${Date.now().toString().slice(-6)}`;
    const newRecord = {
      recordId,
      patientId,
      hospitalId: hospitalId || 'HOSP-FACILITY',
      hospitalName: hospitalName || 'General Healthcare Facility',
      createdById: createdById || 'SYSTEM',
      createdByName: createdByName || 'Attending Physician',
      createdByRole: createdByRole || 'doctor',
      recordCategory,
      recordDate: recordDate || new Date().toISOString().split('T')[0],
      title,
      department: department || 'General Medicine',
      presentingComplaint,
      examinationFindings,
      clinicianDiagnosis,
      treatmentAndFollowUpPlan,
      medications: medications || [],
      labResults: labResults || [],
      dischargeStatus,
      surgicalProcedure,
      sourceDocumentMetadata,
      verificationStatus: createdByRole === 'patient' ? 'patient_submitted' : 'verified_by_clinician',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;

    db.records.set(recordId, newRecord);

    db.addAuditLog({
      actorUid: createdById || 'SYSTEM',
      actorName: createdByName || 'User',
      actorRole: createdByRole || 'doctor',
      patientId,
      hospitalId,
      hospitalName,
      action: 'RECORD_CREATED',
      resourceType: 'medical_record',
      resourceId: recordId,
      purpose: `Creation of new ${recordCategory} record: ${title}`,
      outcome: 'SUCCESS',
    });

    res.json({ success: true, record: newRecord });
  });

  // Clinical amendment route (preserves audit trail without silent overwrite)
  app.post('/api/records/:recordId/amendments', (req: Request, res: Response) => {
    const { recordId } = req.params;
    const { doctorId, doctorName, reason, amendedFieldsDescription } = req.body;

    if (!doctorId || !reason || !amendedFieldsDescription) {
      return res.status(400).json({ success: false, error: 'Missing required amendment details' });
    }

    try {
      const amendment = {
        amendmentId: `AMD-${Date.now().toString().slice(-6)}`,
        doctorId,
        doctorName: doctorName || 'Attending Doctor',
        timestamp: new Date().toISOString(),
        reason,
        amendedFieldsDescription,
        digitalSignature: `SIG-SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      };

      const updated = db.addClinicalAmendment(recordId, amendment);
      res.json({ success: true, record: updated, amendment });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // CROSS-HOSPITAL ACCESS REQUESTS & CONSENTS
  // ==========================================

  app.get('/api/access-requests', (req: Request, res: Response) => {
    const { patientId, doctorId } = req.query as { patientId?: string; doctorId?: string };

    let requests = Array.from(db.accessRequests.values());
    if (patientId) {
      requests = requests.filter(r => r.patientId === patientId);
    }
    if (doctorId) {
      requests = requests.filter(r => r.requesterDoctorId === doctorId);
    }

    res.json({ success: true, requests });
  });

  app.post('/api/access-requests', (req: Request, res: Response) => {
    const { patientId, doctorId, purpose, requestedCategories } = req.body;

    const patient = db.getPatient(patientId);
    const doctor = db.doctors.get(doctorId);

    if (!patient || !doctor) {
      return res.status(400).json({ success: false, error: 'Invalid patient or doctor identifier' });
    }

    const requestId = `REQ-${Date.now().toString().slice(-6)}`;
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const request = {
      requestId,
      patientId: patient.patientId,
      patientName: patient.fullName,
      requesterDoctorId: doctor.doctorId,
      requesterDoctorName: doctor.fullName,
      requesterHospitalId: doctor.primaryHospitalId,
      requesterHospitalName: doctor.primaryHospitalName,
      purpose: purpose || 'Clinical consultation and review of past medical history.',
      requestedRecordCategories: requestedCategories || ['consultation', 'prescription', 'lab_investigation', 'discharge_summary'],
      requestedAt: new Date().toISOString(),
      status: 'pending' as const,
      expiresAt,
    };

    db.accessRequests.set(requestId, request);

    db.addAuditLog({
      actorUid: doctor.userUid,
      actorName: doctor.fullName,
      actorRole: 'doctor',
      patientId: patient.patientId,
      patientName: patient.fullName,
      hospitalId: doctor.primaryHospitalId,
      hospitalName: doctor.primaryHospitalName,
      action: 'ACCESS_REQUESTED',
      resourceType: 'access_request',
      resourceId: requestId,
      purpose: request.purpose,
      outcome: 'SUCCESS',
      details: { requestedCategories: request.requestedRecordCategories },
    });

    res.json({ success: true, request });
  });

  app.post('/api/access-requests/:requestId/approve', (req: Request, res: Response) => {
    const { requestId } = req.params;
    const { approvedCategories, durationDays } = req.body;

    try {
      const consent = db.approveAccessRequest(requestId, approvedCategories, durationDays || 7);
      res.json({ success: true, consent });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post('/api/access-requests/:requestId/deny', (req: Request, res: Response) => {
    const { requestId } = req.params;
    const { reason } = req.body;

    try {
      const updated = db.denyAccessRequest(requestId, reason);
      res.json({ success: true, request: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get('/api/consents/patient/:patientId', (req: Request, res: Response) => {
    const consents = Array.from(db.consents.values()).filter(c => c.patientId === req.params.patientId);
    res.json({ success: true, consents });
  });

  app.post('/api/consents/:consentId/revoke', (req: Request, res: Response) => {
    const { consentId } = req.params;
    const { revokedByUid, revokedByName } = req.body;

    try {
      const consent = db.revokeConsent(consentId, revokedByUid || 'PATIENT', revokedByName || 'Patient');
      res.json({ success: true, consent });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // GEMINI AI CLINICAL SERVICES
  // ==========================================

  // Feature 1: Structured Clinical Summary
  app.post('/api/ai/summarize-history', async (req: Request, res: Response) => {
    const { patientId, doctorId } = req.body;

    const patient = db.getPatient(patientId);
    const doctor = db.doctors.get(doctorId);

    if (!patient || !doctor) {
      return res.status(400).json({ success: false, error: 'Valid patient and doctor parameters are required.' });
    }

    // Check authorization
    const access = db.checkDoctorAccess(doctorId, patientId);
    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Cannot generate AI summary without active patient consent.',
      });
    }

    const records = db.getRecordsForPatient(patientId, access.consent?.authorizedRecordCategories);

    try {
      const summaryResult = await generateClinicalSummary(patient, records, doctor.fullName);

      const summaryId = `SUM-${Date.now().toString().slice(-6)}`;
      const aiSummaryRecord = {
        summaryId,
        patientId,
        generatedById: doctor.doctorId,
        generatedByName: doctor.fullName,
        generatedAt: new Date().toISOString(),
        modelVersion: summaryResult.modelVersion,
        sourceRecordIds: summaryResult.sourceRecordIds,
        summaryContent: summaryResult.summaryContent,
        reviewStatus: 'pending_doctor_review' as const,
      };

      db.aiSummaries.set(summaryId, aiSummaryRecord);

      db.addAuditLog({
        actorUid: doctor.doctorId,
        actorName: doctor.fullName,
        actorRole: 'doctor',
        patientId,
        patientName: patient.fullName,
        hospitalId: doctor.primaryHospitalId,
        hospitalName: doctor.primaryHospitalName,
        action: 'AI_SUMMARY_GENERATED',
        resourceType: 'medical_record',
        resourceId: summaryId,
        purpose: 'Clinician requested AI structured summary of authorized patient history',
        outcome: 'SUCCESS',
        details: { recordsAnalyzed: records.length },
      });

      res.json({ success: true, summary: aiSummaryRecord });
    } catch (err: any) {
      res.status(500).json({ success: false, error: `Failed to generate summary: ${err.message}` });
    }
  });

  // Doctor confirms/signs off on AI summary
  app.post('/api/ai/summaries/:summaryId/confirm', (req: Request, res: Response) => {
    const { summaryId } = req.params;
    const { doctorId } = req.body;

    const summary = db.aiSummaries.get(summaryId);
    if (!summary) return res.status(404).json({ success: false, error: 'Summary not found' });

    summary.reviewStatus = 'confirmed_by_doctor';
    summary.reviewedByDoctorId = doctorId;
    summary.reviewedAt = new Date().toISOString();

    res.json({ success: true, summary });
  });

  // Feature 2: Natural Language Medical Record Search
  app.post('/api/ai/search-records', async (req: Request, res: Response) => {
    const { patientId, doctorId, question } = req.body;

    if (!patientId || !question) {
      return res.status(400).json({ success: false, error: 'Patient ID and question are required' });
    }

    const patient = db.getPatient(patientId);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    let records: any[] = [];
    if (doctorId) {
      const access = db.checkDoctorAccess(doctorId, patientId);
      if (!access.hasAccess) {
        return res.status(403).json({ success: false, error: 'Access denied: Patient consent required for AI query.' });
      }
      records = db.getRecordsForPatient(patientId, access.consent?.authorizedRecordCategories);
    } else {
      records = db.getRecordsForPatient(patientId);
    }

    try {
      const result = await searchRecordsNaturalLanguage(patient, records, question);

      if (doctorId) {
        const doctor = db.doctors.get(doctorId);
        db.addAuditLog({
          actorUid: doctorId,
          actorName: doctor ? doctor.fullName : 'Doctor',
          actorRole: 'doctor',
          patientId,
          patientName: patient.fullName,
          hospitalId: doctor?.primaryHospitalId,
          hospitalName: doctor?.primaryHospitalName,
          action: 'AI_SEARCH_PERFORMED',
          resourceType: 'medical_record',
          resourceId: `PATIENT_QA_${patientId}`,
          purpose: `Clinical inquiry: "${question.substring(0, 80)}"`,
          outcome: 'SUCCESS',
        });
      }

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Feature 3: Medical Document Processing (OCR / Multimodal)
  app.post('/api/ai/extract-document', async (req: Request, res: Response) => {
    const { documentBase64, documentText, mimeType, isImage } = req.body;

    try {
      const content = isImage ? documentBase64 : (documentText || documentBase64);
      const extracted = await extractDocumentData(content, !!isImage, mimeType);

      res.json({ success: true, extracted });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Feature 5: AI Longitudinal Lab Results Comparison
  app.post('/api/ai/compare-results', async (req: Request, res: Response) => {
    const { patientId, testName, doctorId } = req.body;

    if (!patientId || !testName) {
      return res.status(400).json({ success: false, error: 'Patient ID and test name are required' });
    }

    let records = db.getRecordsForPatient(patientId);
    if (doctorId) {
      const access = db.checkDoctorAccess(doctorId, patientId);
      if (!access.hasAccess) {
        return res.status(403).json({ success: false, error: 'Access denied to patient lab records' });
      }
    }

    try {
      const comparison = await compareClinicalResults(records, testName);
      res.json({ success: true, comparison });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Feature 7: Patient-Friendly Term Explainer
  app.post('/api/ai/explain-record', async (req: Request, res: Response) => {
    const { recordId } = req.body;
    const record = db.records.get(recordId);
    if (!record) return res.status(404).json({ success: false, error: 'Record not found' });

    try {
      const explanation = await explainMedicalRecordForPatient(record);
      res.json({ success: true, explanation, record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // ADMINISTRATION & AUDIT LOGS
  // ==========================================

  app.get('/api/admin/statistics', (req: Request, res: Response) => {
    const totalPatients = db.patients.size;
    const totalDoctors = db.doctors.size;
    const verifiedDoctors = Array.from(db.doctors.values()).filter(d => d.verificationStatus === 'verified').length;
    const totalHospitals = db.hospitals.size;
    const totalRecords = db.records.size;
    const activeConsents = Array.from(db.consents.values()).filter(c => c.status === 'active').length;
    const totalAuditEvents = db.auditLogs.length;

    res.json({
      success: true,
      statistics: {
        totalPatients,
        totalDoctors,
        verifiedDoctors,
        totalHospitals,
        totalRecords,
        activeConsents,
        totalAuditEvents,
      },
      hospitals: Array.from(db.hospitals.values()),
      doctors: Array.from(db.doctors.values()),
    });
  });

  app.get('/api/admin/audit-logs', (req: Request, res: Response) => {
    const { patientId, hospitalId, action } = req.query as {
      patientId?: string;
      hospitalId?: string;
      action?: string;
    };

    let logs = [...db.auditLogs];
    if (patientId) logs = logs.filter(l => l.patientId === patientId);
    if (hospitalId) logs = logs.filter(l => l.hospitalId === hospitalId);
    if (action) logs = logs.filter(l => l.action === action);

    res.json({ success: true, logs });
  });

  app.patch('/api/admin/doctors/:doctorId/verify', (req: Request, res: Response) => {
    const { doctorId } = req.params;
    const { status, verifiedBy } = req.body;

    const doctor = db.doctors.get(doctorId);
    if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

    doctor.verificationStatus = status || 'verified';
    doctor.verifiedAt = new Date().toISOString();
    doctor.verifiedBy = verifiedBy || 'Institutional Admin';

    db.addAuditLog({
      actorUid: verifiedBy || 'ADMIN',
      actorName: 'Credentialing Committee',
      actorRole: 'hospital_admin',
      hospitalId: doctor.primaryHospitalId,
      hospitalName: doctor.primaryHospitalName,
      action: 'DOCTOR_VERIFIED',
      resourceType: 'system_policy',
      resourceId: doctor.doctorId,
      purpose: `Doctor medical license verified: ${doctor.professionalRegistrationNumber}`,
      outcome: 'SUCCESS',
    });

    res.json({ success: true, doctor });
  });

  // ==========================================
  // VITE & STATIC SERVING
  // ==========================================

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MediVault AI Server operational on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
