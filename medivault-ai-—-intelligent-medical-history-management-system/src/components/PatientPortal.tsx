import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Upload,
  Shield,
  HelpCircle,
  Activity,
  Calendar,
  Lock,
  ChevronRight,
  User,
  Heart,
  Droplet
} from 'lucide-react';
import { api } from '../services/api.js';
import { PatientProfile, MedicalRecord, AccessRequest, ConsentRecord, AuditLogEvent, RecordCategory } from '../server/types.js';

interface PatientPortalProps {
  patientId: string;
  onRequestStatusChange?: () => void;
  onOpenRegister?: () => void;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({
  patientId,
  onRequestStatusChange,
  onOpenRegister,
}) => {
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Active Views
  const [activeTab, setActiveTab] = useState<'records' | 'requests' | 'consents' | 'audit'>('records');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [explainingRecord, setExplainingRecord] = useState<MedicalRecord | null>(null);
  const [aiExplanation, setAiExplanation] = useState<any | null>(null);
  const [explainingLoading, setExplainingLoading] = useState(false);

  // Approval Modal State
  const [approvingRequest, setApprovingRequest] = useState<AccessRequest | null>(null);
  const [approvalDuration, setApprovalDuration] = useState<number>(7);
  const [selectedCategories, setSelectedCategories] = useState<RecordCategory[]>([
    'consultation',
    'prescription',
    'lab_investigation',
    'radiology_imaging'
  ]);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<RecordCategory>('lab_investigation');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (patientId) {
      loadPatientData();
    } else {
      setLoading(false);
    }
  }, [patientId]);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      const p = await api.getPatient(patientId);
      setPatient(p);

      if (p) {
        const recsRes = await api.getRecords(patientId);
        if (recsRes.records) setRecords(recsRes.records);

        const reqs = await api.getAccessRequests(patientId);
        setRequests(reqs);

        const cons = await api.getConsents(patientId);
        setConsents(cons);

        const logs = await api.getAuditLogs({ patientId });
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error('Error loading patient portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!approvingRequest) return;
    try {
      await api.approveAccess(approvingRequest.requestId, selectedCategories, approvalDuration);
      setApprovingRequest(null);
      await loadPatientData();
      if (onRequestStatusChange) onRequestStatusChange();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleDenyRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to deny this access request?')) return;
    try {
      await api.denyAccess(requestId, 'Patient declined access at this time');
      await loadPatientData();
      if (onRequestStatusChange) onRequestStatusChange();
    } catch (err: any) {
      alert(`Denial error: ${err.message}`);
    }
  };

  const handleRevokeConsent = async (consentId: string) => {
    if (!confirm('Revoking consent will immediately lock your records for this doctor and hospital. Proceed?')) return;
    try {
      await api.revokeConsent(consentId, patient?.patientId || 'PATIENT', patient?.fullName || 'Patient');
      await loadPatientData();
      if (onRequestStatusChange) onRequestStatusChange();
    } catch (err: any) {
      alert(`Revocation error: ${err.message}`);
    }
  };

  const handleExplainRecord = async (record: MedicalRecord) => {
    setExplainingRecord(record);
    setExplainingLoading(true);
    setAiExplanation(null);
    try {
      const res = await api.explainRecord(record.recordId);
      if (res.success) {
        setAiExplanation(res.explanation);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExplainingLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    setUploading(true);
    try {
      await api.createRecord({
        patientId,
        hospitalId: 'HOSP-SELF',
        hospitalName: 'Patient Self-Submitted Archive',
        createdById: patient?.patientId || 'PATIENT',
        createdByName: patient?.fullName || 'Patient',
        createdByRole: 'patient',
        recordCategory: uploadCategory,
        recordDate: new Date().toISOString().split('T')[0],
        title: uploadTitle,
        department: 'Personal Health Records',
        presentingComplaint: uploadNotes,
        sourceDocumentMetadata: {
          originalFileName: `${uploadTitle.replace(/\s+/g, '_')}.pdf`,
          fileSizeKB: 142,
          uploadedAt: new Date().toISOString(),
          hashSHA256: `sha256-${Math.random().toString(36).substring(2, 12)}`,
          isScannedDocument: true,
        },
      });

      setShowUploadModal(false);
      setUploadTitle('');
      setUploadNotes('');
      await loadPatientData();
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading && !patient) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading patient records and consent registry...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">No Patient Profile Active</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            There is currently no patient account registered or selected. Register a new patient account to begin managing personal health records and cross-hospital consent.
          </p>
        </div>
        <button
          onClick={onOpenRegister}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs"
        >
          + Register Patient Profile
        </button>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const activeConsents = consents.filter(c => c.status === 'active');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Patient Header & Quick Demographics */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 flex items-center justify-center font-bold text-xl shrink-0">
              {patient?.fullName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{patient?.fullName}</h1>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-medium tracking-tight">
                  ID: {patient?.patientId}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                <span>DOB: <strong className="text-slate-700 font-mono">{patient?.dateOfBirth}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Gender: <strong className="text-slate-700">{patient?.gender}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Blood Group: <strong className="text-slate-700 font-mono">{patient?.bloodGroup}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Emergency: <strong className="text-slate-700">{patient?.emergencyContact.name} ({patient?.emergencyContact.phone})</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 shadow-xs whitespace-nowrap shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Known Allergies & Documented Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-lg">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Documented Allergies & Sensitivities</span>
            </div>
            {patient?.knownAllergies && patient.knownAllergies.length > 0 ? (
              <div className="space-y-1.5">
                {patient.knownAllergies.map((allergy, i) => (
                  <div key={i} className="text-xs text-amber-950 flex items-start justify-between">
                    <div>
                      <strong className="font-semibold">{allergy.allergen}</strong>
                      <span className="text-amber-800 ml-1.5">— {allergy.reaction}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 font-medium text-amber-800 uppercase shrink-0">
                      {allergy.severity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No known drug allergies documented.</p>
            )}
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 mb-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Diagnosed Baseline Conditions</span>
            </div>
            {patient?.existingConditions && patient.existingConditions.length > 0 ? (
              <div className="space-y-1.5">
                {patient.existingConditions.map((cond, i) => (
                  <div key={i} className="text-xs text-slate-800 flex items-center justify-between">
                    <span>{cond.condition}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Status: {cond.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No baseline medical conditions documented.</p>
            )}
          </div>
        </div>
      </div>

      {/* Pending Access Request Alert Banner (Cross-Hospital Sharing) */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-950">
                  New Cross-Hospital Access Request Awaiting Your Authorization
                </h3>
                <span className="text-xs text-amber-800 font-mono">
                  {pendingRequests.length} Pending
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                An authorized healthcare provider at another hospital is requesting permission to review your past medical records for clinical evaluation. You decide whether to approve or deny.
              </p>

              <div className="mt-4 space-y-3">
                {pendingRequests.map(req => (
                  <div key={req.requestId} className="bg-white p-4 rounded-lg border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-semibold text-slate-900">{req.requesterDoctorName}</strong>
                        <span className="text-xs text-slate-500">at {req.requesterHospitalName}</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1">
                        <strong>Clinical Purpose:</strong> {req.purpose}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-slate-600">
                        <span className="text-slate-400">Requested Categories:</span>
                        {req.requestedRecordCategories.map(cat => (
                          <span key={cat} className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono capitalize">
                            {cat.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setApprovingRequest(req);
                          setSelectedCategories(req.requestedRecordCategories);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve Access</span>
                      </button>
                      <button
                        onClick={() => handleDenyRequest(req.requestId)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>Deny</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('records')}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'records'
              ? 'border-sky-600 text-sky-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Medical Records ({records.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('consents')}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'consents'
              ? 'border-sky-600 text-sky-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Active Consents & Permissions ({activeConsents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-sky-600 text-sky-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Access Requests ({requests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-sky-600 text-sky-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Who Accessed My Records (Audit Trail)</span>
        </button>
      </div>

      {/* Tab 1: Records */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing all clinical consultations, prescriptions, lab results, and discharge reports organized chronologically.
            </p>
          </div>

          {records.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-900">No Medical Records Uploaded Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                You have not uploaded or received any clinical records yet. Click "Upload Document" above to archive your first prescription, lab report, or discharge summary.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {records.map(record => (
                <div
                  key={record.recordId}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all shadow-xs"
                >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-slate-500">{record.recordDate}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-sky-700 font-medium">{record.hospitalName}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="text-slate-600">{record.department}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 capitalize font-mono text-[11px]">
                        {record.recordCategory.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 mt-1">{record.title}</h3>

                    {record.clinicianDiagnosis && (
                      <p className="text-xs text-slate-700 mt-1.5">
                        <strong className="text-slate-900">Documented Diagnosis:</strong> {record.clinicianDiagnosis}
                      </p>
                    )}

                    {record.presentingComplaint && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        <span className="text-slate-400">Notes:</span> {record.presentingComplaint}
                      </p>
                    )}

                    {/* Prescriptions preview */}
                    {record.medications && record.medications.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {record.medications.map(med => (
                          <div
                            key={med.id}
                            className={`px-2 py-0.5 rounded text-xs border ${
                              med.status === 'active'
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            <span className="font-medium">{med.medicationName}</span>{' '}
                            <span className="font-mono text-[11px]">({med.dosage})</span>
                            {med.status === 'discontinued' && <span className="ml-1 text-[10px] text-rose-600 font-bold">[Discontinued]</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Labs preview */}
                    {record.labResults && record.labResults.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {record.labResults.map((l, i) => (
                          <div key={i} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs flex items-center gap-2">
                            <span className="text-slate-600 font-medium">{l.testName}:</span>
                            <span className="font-mono font-semibold text-slate-900">{l.result} {l.unit}</span>
                            {l.flag === 'high' && <span className="text-[10px] text-amber-700 font-bold uppercase">High</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <button
                      onClick={() => handleExplainRecord(record)}
                      className="px-3 py-1.5 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Explain with AI</span>
                    </button>
                    <button
                      onClick={() => setSelectedRecord(record)}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Full Record</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Tab 2: Active Consents */}
      {activeTab === 'consents' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            These healthcare professionals and hospital facilities have been granted time-limited authorization to access your medical records. You may revoke access at any time.
          </p>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-left">
                <tr>
                  <th className="px-4 py-3">Authorized Doctor / Hospital</th>
                  <th className="px-4 py-3">Clinical Purpose</th>
                  <th className="px-4 py-3">Allowed Categories</th>
                  <th className="px-4 py-3">Granted Date</th>
                  <th className="px-4 py-3">Expires At</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {consents.map(con => (
                  <tr key={con.consentId} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3.5 font-medium">
                      <div className="font-semibold text-slate-900">{con.granteeDoctorName}</div>
                      <div className="text-slate-500 text-[11px]">{con.granteeHospitalName}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-xs">{con.purpose}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {con.authorizedRecordCategories.map(cat => (
                          <span key={cat} className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-mono capitalize">
                            {cat.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-500">{con.grantedAt.split('T')[0]}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-700">
                      {con.status === 'active' ? (
                        <span>{con.expiresAt.split('T')[0]}</span>
                      ) : (
                        <span className="text-rose-600 uppercase font-semibold">Revoked</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {con.status === 'active' ? (
                        <button
                          onClick={() => handleRevokeConsent(con.consentId)}
                          className="px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md transition-colors"
                        >
                          Revoke Access
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">Access Inactive</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Access Requests History */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            History of all cross-hospital access requests submitted by healthcare institutions.
          </p>

          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.requestId} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 font-semibold">{req.requesterDoctorName}</strong>
                    <span className="text-slate-500">({req.requesterHospitalName})</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">
                    <strong>Purpose:</strong> {req.purpose}
                  </p>
                  <p className="text-slate-400 font-mono text-[11px] mt-0.5">
                    Requested on: {req.requestedAt.replace('T', ' ').substring(0, 16)}
                  </p>
                </div>

                {req.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setApprovingRequest(req);
                        setSelectedCategories(req.requestedRecordCategories);
                      }}
                      className="px-3 py-1 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDenyRequest(req.requestId)}
                      className="px-3 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                    >
                      Deny
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Trail (Who Accessed My Records) */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-3 bg-sky-50 border border-sky-100 rounded-lg text-xs text-sky-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              <strong>Cryptographic & Tamper-Evident Security Log:</strong> Every instance of a healthcare provider searching your name, viewing your medical records, or generating an AI summary is recorded below with verified timestamp and purpose.
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-left">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Healthcare Provider / Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Stated Purpose</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {auditLogs.map(log => (
                  <tr key={log.eventId} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                      {log.timestamp.replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div className="text-slate-900 font-semibold">{log.actorName}</div>
                      <div className="text-slate-500 text-[11px]">{log.hospitalName || 'Self / Patient Portal'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-sm leading-snug">{log.purpose}</td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.outcome === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Explain with AI */}
      {explainingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">Patient-Friendly AI Explanation</h3>
              </div>
              <button
                onClick={() => setExplainingRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs border border-slate-200">
              <div className="font-semibold text-slate-900">{explainingRecord.title}</div>
              <div className="text-slate-500">{explainingRecord.hospitalName} · {explainingRecord.recordDate}</div>
            </div>

            {explainingLoading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Gemini AI is translating clinical terms into clear, plain language...</p>
              </div>
            ) : aiExplanation ? (
              <div className="space-y-4 text-xs text-slate-700">
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl leading-relaxed whitespace-pre-line">
                  {aiExplanation.plainLanguageExplanation}
                </div>

                {aiExplanation.keyTermsExplained && aiExplanation.keyTermsExplained.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-2">Key Medical Terms in Plain English:</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {aiExplanation.keyTermsExplained.map((term: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                          <strong className="text-indigo-900 font-semibold">{term.term}:</strong>{' '}
                          <span className="text-slate-700">{term.explanation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                  <strong>Important Note:</strong> {aiExplanation.nextStepsAdvice || 'Always talk with your doctor before making any changes to your medication or lifestyle.'}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Unable to generate explanation.</p>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setExplainingRecord(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Full Record View */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono text-slate-400">{selectedRecord.recordId}</span>
                <h3 className="font-bold text-lg text-slate-900">{selectedRecord.title}</h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400">Date:</span>
                <p className="font-semibold text-slate-800 font-mono">{selectedRecord.recordDate}</p>
              </div>
              <div>
                <span className="text-slate-400">Hospital:</span>
                <p className="font-semibold text-slate-800 truncate">{selectedRecord.hospitalName}</p>
              </div>
              <div>
                <span className="text-slate-400">Clinician:</span>
                <p className="font-semibold text-slate-800 truncate">{selectedRecord.createdByName}</p>
              </div>
              <div>
                <span className="text-slate-400">Category:</span>
                <p className="font-semibold text-slate-800 capitalize">{selectedRecord.recordCategory.replace('_', ' ')}</p>
              </div>
            </div>

            {selectedRecord.presentingComplaint && (
              <div className="text-xs">
                <span className="font-semibold text-slate-900">Presenting Symptoms / Complaint:</span>
                <p className="text-slate-700 mt-0.5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {selectedRecord.presentingComplaint}
                </p>
              </div>
            )}

            {selectedRecord.examinationFindings && (
              <div className="text-xs">
                <span className="font-semibold text-slate-900">Clinical Examination Findings:</span>
                <p className="text-slate-700 mt-0.5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {selectedRecord.examinationFindings}
                </p>
              </div>
            )}

            {selectedRecord.clinicianDiagnosis && (
              <div className="text-xs">
                <span className="font-semibold text-slate-900">Diagnosis:</span>
                <p className="text-slate-800 font-semibold mt-0.5 bg-sky-50/50 p-3 rounded-lg border border-sky-100">
                  {selectedRecord.clinicianDiagnosis}
                </p>
              </div>
            )}

            {selectedRecord.medications && selectedRecord.medications.length > 0 && (
              <div className="text-xs">
                <span className="font-semibold text-slate-900">Medications Documented:</span>
                <div className="mt-1 space-y-1.5">
                  {selectedRecord.medications.map(m => (
                    <div key={m.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                      <div>
                        <strong className="text-slate-900">{m.medicationName}</strong> — {m.dosage} ({m.frequency})
                        <div className="text-[11px] text-slate-500 mt-0.5">{m.instructions}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        m.status === 'active' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedRecord.labResults && selectedRecord.labResults.length > 0 && (
              <div className="text-xs">
                <span className="font-semibold text-slate-900">Diagnostic Laboratory Findings:</span>
                <div className="mt-1 divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {selectedRecord.labResults.map((l, i) => (
                    <div key={i} className="p-2.5 bg-white flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{l.testName}</div>
                        <div className="text-slate-500 text-[11px]">{l.clinicalInterpretation}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">{l.result} {l.unit}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Ref: {l.referenceRange}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedRecord.treatmentAndFollowUpPlan && (
              <div className="text-xs">
                <span className="font-semibold text-slate-900">Treatment & Follow-up Recommendations:</span>
                <p className="text-slate-700 mt-0.5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {selectedRecord.treatmentAndFollowUpPlan}
                </p>
              </div>
            )}

            {/* Amendments if any */}
            {selectedRecord.amendments && selectedRecord.amendments.length > 0 && (
              <div className="text-xs pt-3 border-t border-slate-200">
                <span className="font-bold text-amber-900">Audited Clinical Amendments:</span>
                <div className="space-y-2 mt-1">
                  {selectedRecord.amendments.map(am => (
                    <div key={am.amendmentId} className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg">
                      <div className="flex items-center justify-between text-amber-950 font-semibold">
                        <span>Signed by {am.doctorName}</span>
                        <span className="font-mono text-[10px] text-amber-700">{am.timestamp.split('T')[0]}</span>
                      </div>
                      <p className="text-slate-700 mt-1">Reason: {am.reason}</p>
                      <p className="text-slate-800 font-medium mt-0.5">{am.amendedFieldsDescription}</p>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">Signature: {am.digitalSignature}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Approve Access Request */}
      {approvingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Grant Cross-Hospital Consent</h3>
                <p className="text-xs text-slate-500">Authorize time-limited medical record access</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div><strong>Requester:</strong> {approvingRequest.requesterDoctorName}</div>
              <div><strong>Hospital:</strong> {approvingRequest.requesterHospitalName}</div>
              <div><strong>Stated Purpose:</strong> {approvingRequest.purpose}</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900">Authorized Record Categories:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['consultation', 'prescription', 'lab_investigation', 'radiology_imaging', 'discharge_summary'] as RecordCategory[]).map(cat => {
                  const checked = selectedCategories.includes(cat);
                  return (
                    <label key={cat} className="flex items-center gap-2 p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setSelectedCategories(selectedCategories.filter(c => c !== cat));
                          } else {
                            setSelectedCategories([...selectedCategories, cat]);
                          }
                        }}
                        className="rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span className="capitalize">{cat.replace('_', ' ')}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">Authorization Validity Duration:</label>
              <select
                value={approvalDuration}
                onChange={(e) => setApprovalDuration(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value={1}>24 Hours (Emergency Triage)</option>
                <option value={7}>7 Days (Outpatient Evaluation - Recommended)</option>
                <option value={30}>30 Days (Extended Specialist Treatment)</option>
              </select>
            </div>

            <div className="p-3 bg-sky-50 rounded-lg text-[11px] text-sky-900 leading-snug">
              You can revoke this consent at any point in the "Active Consents" tab. All accesses by this doctor will be immutably recorded in your security audit trail.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setApprovingRequest(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveRequest}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
              >
                Confirm & Grant Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Upload Medical Document */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleUploadSubmit} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-base text-slate-900">Upload Past Medical Document</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Document Title</label>
              <input
                type="text"
                required
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder="e.g. Previous Blood Lab Panel 2024"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Record Category</label>
              <select
                value={uploadCategory}
                onChange={e => setUploadCategory(e.target.value as RecordCategory)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="lab_investigation">Laboratory Investigation / Blood Test</option>
                <option value="consultation">Outpatient Consultation Slip</option>
                <option value="prescription">Prescription / Pharmacy Order</option>
                <option value="discharge_summary">Hospital Discharge Summary</option>
                <option value="radiology_imaging">Radiology / Imaging Report</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Notes / Clinical Summary</label>
              <textarea
                value={uploadNotes}
                onChange={e => setUploadNotes(e.target.value)}
                placeholder="Details of which clinic, prescribing doctor, or presenting reason..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-slate-700">Simulate Document Ingestion</p>
              <p className="text-[11px] text-slate-400">PDF, JPG, PNG accepted. Secure SHA-256 hash created upon submission.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-xs"
              >
                {uploading ? 'Archiving...' : 'Save to My Records'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
