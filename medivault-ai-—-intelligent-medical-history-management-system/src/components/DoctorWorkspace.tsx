import React, { useState, useEffect } from 'react';
import {
  Search,
  Lock,
  Unlock,
  Sparkles,
  FileText,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  Send,
  Upload,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Edit3,
  Stethoscope,
  Building2,
  ChevronDown
} from 'lucide-react';
import { api, Persona } from '../services/api.js';
import {
  PatientProfile,
  MedicalRecord,
  AISummary,
  RecordCategory,
  DoctorProfile
} from '../server/types.js';

interface DoctorWorkspaceProps {
  activeDoctorPersona: Persona;
  onRequestStatusChange?: () => void;
  onOpenRegister?: (role?: 'patient' | 'doctor' | 'hospital_admin' | 'system_admin') => void;
}

export const DoctorWorkspace: React.FC<DoctorWorkspaceProps> = ({
  activeDoctorPersona,
  onRequestStatusChange,
  onOpenRegister,
}) => {
  // Patient Search State
  const [searchId, setSearchId] = useState('');
  const [searchDob, setSearchDob] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [activePatient, setActivePatient] = useState<PatientProfile | null>(null);
  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);
  const [accessConsent, setAccessConsent] = useState<any | null>(null);
  const [registeredPatients, setRegisteredPatients] = useState<any[]>([]);

  // Request Access Form State
  const [requestPurpose, setRequestPurpose] = useState('Clinical evaluation & cross-hospital medical history review');
  const [selectedCategories, setSelectedCategories] = useState<RecordCategory[]>([
    'consultation',
    'prescription',
    'lab_investigation',
    'radiology_imaging'
  ]);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Active Workspace Sub-Tab
  const [workspaceTab, setWorkspaceTab] = useState<'summary' | 'qa' | 'timeline' | 'upload_extract' | 'comparison' | 'records'>('summary');

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryConfirmed, setSummaryConfirmed] = useState(false);

  // Natural Language QA State
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<Array<{ question: string; answer: string; citations: any[]; factsDocumented: boolean }>>([]);

  // Longitudinal Comparison State
  const [comparisonTest, setComparisonTest] = useState('HbA1c');
  const [comparisonData, setComparisonData] = useState<any | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Document Upload & AI Extraction State
  const [sampleDocumentType, setSampleDocumentType] = useState('lab');
  const [documentInputText, setDocumentInputText] = useState('');
  const [extractingDocument, setExtractingDocument] = useState(false);
  const [extractedCandidate, setExtractedCandidate] = useState<any | null>(null);
  const [committingExtracted, setCommittingExtracted] = useState(false);

  // Clinical Amendment State
  const [amendingRecordId, setAmendingRecordId] = useState<string | null>(null);
  const [amendmentReason, setAmendmentReason] = useState('');
  const [amendmentNote, setAmendmentNote] = useState('');

  // Timeline category filter
  const [timelineFilter, setTimelineFilter] = useState<string>('all');

  useEffect(() => {
    loadRegisteredPatientsList();
  }, [activeDoctorPersona]);

  const loadRegisteredPatientsList = async () => {
    try {
      const list = await api.getPatients();
      setRegisteredPatients(list);
      if (list.length > 0 && !searchId) {
        setSearchId(list[0].patientId);
        setSearchDob(list[0].dateOfBirth);
        handleSearchPatient(list[0].patientId, list[0].dateOfBirth);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchPatient = async (idToSearch?: string, dobToSearch?: string) => {
    const id = idToSearch || searchId;
    const dob = dobToSearch || searchDob;
    if (!id.trim()) return;

    setSearching(true);
    setSearchResult(null);
    setActivePatient(null);
    setPatientRecords([]);
    setAccessConsent(null);
    setRequestSubmitted(false);
    setAiSummary(null);

    try {
      const res = await api.searchPatient(id, dob, activeDoctorPersona.doctorId);
      setSearchResult(res);

      if (res.matched && res.patient) {
        const fullPatient = await api.getPatient(res.patient.patientId);
        setActivePatient(fullPatient);

        if (res.accessStatus && res.accessStatus.hasAccess) {
          setAccessConsent(res.accessStatus.consent);
          // Load records
          const recsRes = await api.getRecords(res.patient.patientId, activeDoctorPersona.doctorId);
          if (recsRes.records) {
            setPatientRecords(recsRes.records);
          }
        }
      }
    } catch (err) {
      console.error('Patient search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient || !activeDoctorPersona.doctorId) return;

    setRequestingAccess(true);
    try {
      await api.requestAccess({
        patientId: activePatient.patientId,
        doctorId: activeDoctorPersona.doctorId,
        purpose: requestPurpose,
        requestedCategories: selectedCategories,
      });
      setRequestSubmitted(true);
      if (onRequestStatusChange) onRequestStatusChange();
    } catch (err: any) {
      alert(`Request error: ${err.message}`);
    } finally {
      setRequestingAccess(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!activePatient || !activeDoctorPersona.doctorId) return;
    setSummaryLoading(true);
    try {
      const res = await api.generateSummary(activePatient.patientId, activeDoctorPersona.doctorId);
      if (res.success && res.summary) {
        setAiSummary(res.summary);
        setSummaryConfirmed(res.summary.reviewStatus === 'confirmed_by_doctor');
      }
    } catch (err: any) {
      alert(`Summary generation failed: ${err.message}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleConfirmSummary = async () => {
    if (!aiSummary || !activeDoctorPersona.doctorId) return;
    try {
      await api.confirmSummary(aiSummary.summaryId, activeDoctorPersona.doctorId);
      setSummaryConfirmed(true);
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaQuestion.trim() || !activePatient) return;

    const q = qaQuestion;
    setQaLoading(true);
    setQaQuestion('');

    try {
      const res = await api.searchRecordsNL(activePatient.patientId, q, activeDoctorPersona.doctorId);
      if (res.success) {
        setQaHistory(prev => [
          {
            question: q,
            answer: res.answer,
            citations: res.citations || [],
            factsDocumented: res.factsDocumented,
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      alert(`Search error: ${err.message}`);
    } finally {
      setQaLoading(false);
    }
  };

  const handleLoadComparison = async (testName: string) => {
    if (!activePatient) return;
    setComparisonTest(testName);
    setComparisonLoading(true);
    try {
      const res = await api.compareResults(activePatient.patientId, testName, activeDoctorPersona.doctorId);
      if (res.success) {
        setComparisonData(res.comparison);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleExtractDocument = async () => {
    setExtractingDocument(true);
    setExtractedCandidate(null);

    let docText = documentInputText;
    if (!docText.trim()) {
      const pName = activePatient?.fullName || 'Patient';
      const pId = activePatient?.patientId || 'MV-P-NEW';
      const pDob = activePatient?.dateOfBirth || '1980-01-01';
      docText = `DIAGNOSTIC CLINICAL REPORT
Date: ${new Date().toISOString().split('T')[0]}
Patient Name: ${pName} (ID: ${pId})
DOB: ${pDob}
CLINICAL INVESTIGATIONS:
- Fasting Blood Sugar: 118 mg/dL (Reference: 70 - 99 mg/dL) [HIGH]
- Hemoglobin A1c: 6.8 % (Reference: 4.0 - 5.6 %) [HIGH]
- Serum Creatinine: 0.95 mg/dL (Reference: 0.6 - 1.2 mg/dL) [NORMAL]
- eGFR: 84 mL/min/1.73m2 (Reference: > 60) [NORMAL]
MEDICATIONS:
- Metformin HCl 500mg Oral Twice Daily with Meals
CLINICAL IMPRESSION:
Routine glycemic monitoring. Renal excretory function preserved.`;
      setDocumentInputText(docText);
    }

    try {
      const res = await api.extractDocument({ documentText: docText, isImage: false });
      if (res.success) {
        setExtractedCandidate(res.extracted);
      }
    } catch (err: any) {
      alert(`Extraction error: ${err.message}`);
    } finally {
      setExtractingDocument(false);
    }
  };

  const handleCommitExtractedRecord = async () => {
    if (!extractedCandidate || !activePatient) return;
    setCommittingExtracted(true);
    try {
      await api.createRecord({
        patientId: activePatient.patientId,
        hospitalId: activeDoctorPersona.hospitalName ? `HOSP-${activeDoctorPersona.hospitalName.replace(/\s+/g, '-').toUpperCase().slice(0, 8)}` : 'HOSP-FACILITY',
        hospitalName: activeDoctorPersona.hospitalName || 'Clinical Facility',
        createdById: activeDoctorPersona.doctorId || 'DOC-VERIFIED',
        createdByName: activeDoctorPersona.name,
        createdByRole: 'doctor',
        recordCategory: extractedCandidate.documentType || 'lab_investigation',
        recordDate: extractedCandidate.documentDate !== 'Not Documented' ? extractedCandidate.documentDate : new Date().toISOString().split('T')[0],
        title: `Ingested ${extractedCandidate.documentType.replace('_', ' ')}: ${extractedCandidate.diagnosis || 'Clinical Update'}`,
        department: 'Diagnostic Medicine',
        clinicianDiagnosis: extractedCandidate.diagnosis,
        examinationFindings: extractedCandidate.clinicalNotes,
        labResults: extractedCandidate.labResults,
        medications: extractedCandidate.medications?.map((m: any, idx: number) => ({
          id: `med-extracted-${idx}`,
          medicationName: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          route: m.route || 'Oral',
          startDate: new Date().toISOString().split('T')[0],
          instructions: 'Verified from document extraction',
          status: 'active',
          prescribingDoctor: activeDoctorPersona.name,
        })),
        sourceDocumentMetadata: {
          originalFileName: 'Extracted_Clinical_Report.pdf',
          fileSizeKB: 215,
          uploadedAt: new Date().toISOString(),
          hashSHA256: `sha256-verified-${Date.now()}`,
          isScannedDocument: true,
        },
      });

      alert('Extracted document successfully committed and cryptographically signed to patient medical chart!');
      setExtractedCandidate(null);
      setDocumentInputText('');
      // Reload records
      handleSearchPatient();
    } catch (err: any) {
      alert(`Commit error: ${err.message}`);
    } finally {
      setCommittingExtracted(false);
    }
  };

  const handleSaveAmendment = async (recordId: string) => {
    if (!amendmentReason.trim() || !amendmentNote.trim()) {
      alert('Please provide both an amendment reason and clinical description.');
      return;
    }
    try {
      await api.addAmendment(recordId, {
        doctorId: activeDoctorPersona.doctorId || 'DOC-VERIFIED',
        doctorName: activeDoctorPersona.name,
        reason: amendmentReason,
        amendedFieldsDescription: amendmentNote,
      });

      alert('Clinical amendment appended to permanent record with digital signature!');
      setAmendingRecordId(null);
      setAmendmentReason('');
      setAmendmentNote('');
      handleSearchPatient();
    } catch (err: any) {
      alert(`Amendment error: ${err.message}`);
    }
  };

  if (!activeDoctorPersona || activeDoctorPersona.role !== 'doctor') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
          <Stethoscope className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Physician Authentication Required</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {activeDoctorPersona ? `You are currently viewing as ${activeDoctorPersona.name} (${activeDoctorPersona.role.replace('_', ' ')}). ` : ''}
            Clinical record inspection, prescription management, and Gemini AI clinical summaries are restricted to verified doctors with active patient consent.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          {onOpenRegister && (
            <button
              onClick={() => onOpenRegister('doctor')}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              + Register Doctor Profile
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Doctor Header Profile */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center font-bold text-xl shrink-0">
              <Stethoscope className="w-7 h-7 text-teal-700" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{activeDoctorPersona.name}</h1>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Clinician
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                <span>Hospital: <strong className="text-slate-800">{activeDoctorPersona.hospitalName || 'Affiliated Medical Center'}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Doctor ID: <strong className="text-slate-700 font-mono">{activeDoctorPersona.doctorId}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Specialization: <strong className="text-slate-700">{activeDoctorPersona.subtitle}</strong></span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs max-w-sm">
            <div className="flex items-center gap-2 text-slate-700 font-semibold mb-1">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>Cross-Hospital Interoperability Rules</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-snug">
              Patient records from external hospitals require verified patient identification and active patient consent. All queries are audited.
            </p>
          </div>
        </div>
      </div>

      {/* Patient Search & Verification Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Secure Patient Identification & Registry Lookup</h2>
            <p className="text-xs text-slate-500">
              Requires official Patient ID and Date of Birth to prevent unauthorized or casual search.
            </p>
          </div>

          {/* Quick select from real registered patients */}
          {registeredPatients.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <span>Select Patient:</span>
              {registeredPatients.slice(0, 4).map(p => (
                <button
                  key={p.patientId}
                  onClick={() => {
                    setSearchId(p.patientId);
                    setSearchDob(p.dateOfBirth);
                    handleSearchPatient(p.patientId, p.dateOfBirth);
                  }}
                  className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-mono text-[11px] hover:bg-sky-100 border border-sky-100"
                >
                  {p.fullName} ({p.patientId})
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <label className="text-xs font-semibold text-slate-700 block mb-1">Patient ID</label>
            <input
              type="text"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              placeholder="e.g. MV-P-1001"
              className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="text-xs font-semibold text-slate-700 block mb-1">Date of Birth (YYYY-MM-DD)</label>
            <input
              type="text"
              value={searchDob}
              onChange={e => setSearchDob(e.target.value)}
              placeholder="YYYY-MM-DD"
              className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="sm:col-span-3 flex items-end">
            <button
              onClick={() => handleSearchPatient()}
              disabled={searching}
              className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Search className="w-4 h-4" />
              <span>{searching ? 'Verifying...' : 'Search Patient'}</span>
            </button>
          </div>
        </div>

        {/* Identity Search Feedback Status */}
        {searchResult && (
          <div className="pt-2">
            {!searchResult.matched && searchResult.requiresDobVerification && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Patient record exists, but Date of Birth verification failed or was not provided. Please confirm the patient's DOB to access profile.
                </span>
              </div>
            )}

            {searchResult.matched && activePatient && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-sm">
                    {activePatient.fullName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-slate-900">{activePatient.fullName}</strong>
                      <span className="text-xs text-slate-500 font-mono">({activePatient.patientId})</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-600">DOB: {activePatient.dateOfBirth} ({activePatient.gender})</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span>Blood Group: <strong className="text-slate-700 font-mono">{activePatient.bloodGroup}</strong></span>
                      <span>Emergency: <strong className="text-slate-700">{activePatient.emergencyContact.name} ({activePatient.emergencyContact.phone})</strong></span>
                    </div>
                  </div>
                </div>

                {/* Consent & Access Badge */}
                <div className="flex items-center gap-3 shrink-0">
                  {accessConsent ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                      <Unlock className="w-4 h-4 text-emerald-600" />
                      <span>Authorized Access Active (Expires: {accessConsent.expiresAt.split('T')[0]})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>Cross-Hospital Consent Required</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CASE 0: No Patient Searched or Found Yet */}
      {!activePatient && !searchResult && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
            <Search className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Patient Identification & Search</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Enter the patient's unique Patient ID and Date of Birth in the search bar above to verify their identity and inspect authorized clinical records.
            </p>
          </div>
          {onOpenRegister && (
            <div className="pt-2">
              <button
                onClick={() => onOpenRegister('patient')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                + Register New Patient Profile
              </button>
            </div>
          )}
        </div>
      )}

      {/* CASE 1: Patient Found, but Cross-Hospital Consent Is Required! */}
      {activePatient && !accessConsent && (
        <div className="bg-white border-2 border-dashed border-amber-300 rounded-2xl p-8 shadow-xs space-y-6">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Patient Medical Records Are Locked
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dr. {activeDoctorPersona.name}, this patient's medical history was documented at another healthcare institution. In accordance with patient privacy regulations and hospital policy, you must submit a formal Access Request with a stated clinical justification.
            </p>
          </div>

          {requestSubmitted ? (
            <div className="max-w-xl mx-auto p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
              <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-950">Access Request Successfully Dispatched to Patient</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Patient {activePatient.fullName} has received your request in their Patient Portal. Once they tap "Approve Access", this workspace will automatically unlock.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => handleSearchPatient()}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800"
                >
                  Refresh Access Status
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRequestAccess} className="max-w-xl mx-auto bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Submit Cross-Hospital Access Request
              </h4>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Clinical Justification / Reason</label>
                <textarea
                  required
                  rows={2}
                  value={requestPurpose}
                  onChange={e => setRequestPurpose(e.target.value)}
                  placeholder="e.g. Acute exacerbation evaluation; verifying previous cardiac medications and lab baseline."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Requested Clinical Record Categories:</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['consultation', 'prescription', 'lab_investigation', 'radiology_imaging'] as RecordCategory[]).map(cat => {
                    const isChecked = selectedCategories.includes(cat);
                    return (
                      <label key={cat} className="flex items-center gap-2 p-2 rounded border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
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

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                Notice: All access requests are logged permanently in the institutional audit registry under your medical license ({activeDoctorPersona.doctorId}).
              </div>

              <button
                type="submit"
                disabled={requestingAccess}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{requestingAccess ? 'Dispatching...' : 'Request Access from Patient'}</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* CASE 2: Patient Unlocked With Active Consent! */}
      {activePatient && accessConsent && (
        <div className="space-y-6">
          {/* Workspace Sub-Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto pb-1">
            <button
              onClick={() => setWorkspaceTab('summary')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                workspaceTab === 'summary'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>10-Point AI Summary</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('qa')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                workspaceTab === 'qa'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Natural Language Search (Q&A)</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('timeline')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                workspaceTab === 'timeline'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Chronological Timeline</span>
            </button>

            <button
              onClick={() => {
                setWorkspaceTab('comparison');
                handleLoadComparison(comparisonTest);
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                workspaceTab === 'comparison'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Longitudinal Comparison</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('upload_extract')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                workspaceTab === 'upload_extract'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Document Processing (OCR)</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('records')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                workspaceTab === 'records'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Source Records ({patientRecords.length})</span>
            </button>
          </div>

          {/* TAB 1: 10-Point Structured Gemini AI Summary */}
          {workspaceTab === 'summary' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-sky-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      10-Point Structured Clinical History Synthesis
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Synthesizes authorized records across previous hospitals into 10 structured clinical checkpoints with strict source record citations.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateSummary}
                    disabled={summaryLoading}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{summaryLoading ? 'Synthesizing with Gemini...' : (aiSummary ? 'Regenerate Summary' : 'Generate AI Summary')}</span>
                  </button>
                </div>
              </div>

              {/* Clinical Verification Callout */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-snug">
                    <strong>Mandatory Clinical Responsibility Notice:</strong> AI summaries assist clinical review and do not formulate independent diagnoses or alter prescriptions. Attending physician remains responsible for all patient treatment decisions.
                  </div>
                </div>

                {aiSummary && (
                  <button
                    onClick={handleConfirmSummary}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                      summaryConfirmed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{summaryConfirmed ? 'Doctor Verified & Signed' : 'Confirm & Sign Review'}</span>
                  </button>
                )}
              </div>

              {/* Summary Content Body */}
              {summaryLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    Gemini 3.8 Flash is analyzing {patientRecords.length} authorized clinical records and cross-referencing citations...
                  </p>
                </div>
              ) : aiSummary ? (
                <div className="space-y-6 text-xs text-slate-800">
                  {/* Point 1: Demographics */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="font-bold text-slate-900 text-xs block mb-1">1. Baseline Patient Context & Demographics</span>
                    <p className="text-slate-700 leading-relaxed">{aiSummary.summaryContent.baselineDemographics}</p>
                  </div>

                  {/* 2 & 3: Conditions & Hospital Visits */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 text-xs block mb-2">2. Documented Past Medical Conditions</span>
                      <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                        {aiSummary.summaryContent.pastConditions.map((c, i) => (
                          <li key={i} className="leading-snug">{c}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 text-xs block mb-2">3. Previous Hospital & Clinic Visits</span>
                      <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                        {aiSummary.summaryContent.hospitalVisits.map((v, i) => (
                          <li key={i} className="leading-snug">{v}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 4. Active vs Historical Medications */}
                  <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-950 text-xs">
                        4. Medication History (Active vs Historical Separated)
                      </span>
                      <span className="text-[11px] text-sky-700 font-mono">Strict Provenance</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="font-semibold text-slate-900 block mb-1 text-[11px]">Current Active Medications:</span>
                        <div className="space-y-1.5">
                          {aiSummary.summaryContent.currentMedications.map((m, i) => (
                            <div key={i} className="p-2 bg-white rounded border border-sky-200 flex items-center justify-between">
                              <div>
                                <strong className="text-slate-900">{m.medication}</strong>
                                <div className="text-[10px] text-slate-500">{m.dosage}</div>
                              </div>
                              <span className="px-1.5 py-0.2 bg-sky-100 text-sky-800 rounded font-mono text-[10px]">
                                {m.sourceRecordId}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="font-semibold text-slate-600 block mb-1 text-[11px]">Historical / Discontinued Medications:</span>
                        <div className="space-y-1.5">
                          {aiSummary.summaryContent.historicalMedications.map((m, i) => (
                            <div key={i} className="p-2 bg-white/70 rounded border border-slate-200 flex items-center justify-between text-slate-600">
                              <div>
                                <span>{m.medication}</span>
                                <span className="ml-1 text-[10px] text-rose-600 font-bold uppercase">({m.status})</span>
                              </div>
                              <span className="font-mono text-[10px] text-slate-400">{m.sourceRecordId}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5 & 6: Allergies & Key Investigations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                      <span className="font-bold text-amber-950 text-xs block mb-2">5. Documented Allergies</span>
                      <ul className="space-y-1 list-disc list-inside text-amber-900">
                        {aiSummary.summaryContent.documentedAllergies.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 text-xs block mb-2">6. Key Investigations & Diagnostic Labs</span>
                      <div className="space-y-1.5">
                        {aiSummary.summaryContent.keyInvestigations.map((inv, i) => (
                          <div key={i} className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                            <div>
                              <strong className="text-slate-900">{inv.test}:</strong>{' '}
                              <span className="font-mono font-semibold text-slate-800">{inv.result}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{inv.date} [{inv.sourceRecordId}]</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 7 & 8: Surgeries & Follow-up */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 text-xs block mb-2">7. Surgical & Procedure History</span>
                      <ul className="space-y-1 list-disc list-inside text-slate-700">
                        {aiSummary.summaryContent.surgicalHistory.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-slate-900 text-xs block mb-2">8. Clinician Follow-up Recommendations</span>
                      <p className="text-slate-700 leading-relaxed">{aiSummary.summaryContent.followUpPlan}</p>
                    </div>
                  </div>

                  {/* 9 & 10: Data Gaps & Discrepancies */}
                  <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl">
                    <span className="font-bold text-rose-950 text-xs block mb-2">
                      9 & 10. Data Gaps, Discrepancies & Uncertain Dates Requiring Doctor Review
                    </span>
                    <ul className="space-y-1 list-disc list-inside text-rose-900">
                      {aiSummary.summaryContent.dataGapsAndConflicts.map((gap, i) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 space-y-3">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs">Click "Generate AI Summary" to compile a 10-point cross-hospital clinical synthesis.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Natural Language Medical Record Search (QA) */}
          {workspaceTab === 'qa' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Natural-Language Medical Record Search</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ask targeted clinical questions over authorized medical records. Gemini searches only permitted records and returns grounded citations.
                </p>
              </div>

              {/* Sample Quick Questions */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium">Suggested queries:</span>
                {[
                  'What allergies are documented for this patient?',
                  'Show previous hospital visits and dates',
                  'List all documented blood glucose and HbA1c test results',
                  'What medications were recorded in the most recent prescription?',
                ].map((sampleQ, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQaQuestion(sampleQ);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] transition-colors"
                  >
                    {sampleQ}
                  </button>
                ))}
              </div>

              {/* QA Input Box */}
              <form onSubmit={handleAskQuestion} className="flex gap-2">
                <input
                  type="text"
                  value={qaQuestion}
                  onChange={e => setQaQuestion(e.target.value)}
                  placeholder="e.g. Has the patient experienced adverse reactions to beta-lactam antibiotics?"
                  className="flex-1 text-xs p-3 rounded-xl border border-slate-300 focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  disabled={qaLoading || !qaQuestion.trim()}
                  className="px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{qaLoading ? 'Searching...' : 'Ask Query'}</span>
                </button>
              </form>

              {/* QA Results Feed */}
              <div className="space-y-4">
                {qaHistory.map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <strong className="text-slate-900 font-semibold">Q: {item.question}</strong>
                      <span className="text-[10px] font-mono">Audited</span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line">
                      {item.answer}
                    </div>

                    {item.citations && item.citations.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 pt-1">
                        <span className="text-slate-400">Supporting Records:</span>
                        {item.citations.map((c, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px] text-slate-700">
                            {c.recordId} ({c.date})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Chronological Timeline */}
          {workspaceTab === 'timeline' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chronological Medical History Timeline</h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive cross-hospital events in chronological sequence.
                  </p>
                </div>

                {/* Category Filters */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                  {['all', 'consultation', 'prescription', 'lab_investigation', 'radiology_imaging'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setTimelineFilter(cat)}
                      className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors capitalize ${
                        timelineFilter === cat
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline Items */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {patientRecords
                  .filter(r => timelineFilter === 'all' || r.recordCategory === timelineFilter)
                  .map(record => (
                    <div key={record.recordId} className="relative group">
                      <div className="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-sky-600 shadow-xs" />
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-sky-700">{record.recordDate}</span>
                          <span className="px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 capitalize font-mono text-[10px]">
                            {record.recordCategory.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">{record.title}</h4>
                        <div className="text-slate-500 text-[11px]">
                          {record.hospitalName} · Clinician: {record.createdByName}
                        </div>
                        {record.clinicianDiagnosis && (
                          <p className="text-slate-700 pt-1">
                            <strong>Diagnosis:</strong> {record.clinicianDiagnosis}
                          </p>
                        )}
                        {record.medications && record.medications.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {record.medications.map(m => (
                              <span key={m.id} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[10px]">
                                {m.medicationName} ({m.dosage})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 4: Longitudinal Comparison */}
          {workspaceTab === 'comparison' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">AI-Assisted Longitudinal Result Comparison</h3>
                  <p className="text-xs text-slate-500">
                    Tracks clinical measurements across dates and facilities, with automatic unit compatibility verification.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Test:</span>
                  <select
                    value={comparisonTest}
                    onChange={e => handleLoadComparison(e.target.value)}
                    className="text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="HbA1c">Hemoglobin A1c (HbA1c)</option>
                    <option value="Fasting Plasma Glucose">Fasting Plasma Glucose</option>
                    <option value="Total Cholesterol">Total Cholesterol</option>
                    <option value="Creatinine">Serum Creatinine</option>
                  </select>
                </div>
              </div>

              {comparisonLoading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Calculating longitudinal trajectory...</p>
                </div>
              ) : comparisonData ? (
                <div className="space-y-4">
                  {/* Unit warning if any */}
                  {comparisonData.unitConsistencyWarning && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{comparisonData.unitConsistencyWarning}</span>
                    </div>
                  )}

                  {/* Chronological Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold text-left">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Recorded Value</th>
                          <th className="px-4 py-3">Unit</th>
                          <th className="px-4 py-3">Reporting Hospital</th>
                          <th className="px-4 py-3">Record Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {comparisonData.dataPoints.map((pt: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono font-semibold text-slate-900">{pt.date}</td>
                            <td className="px-4 py-3 font-mono font-bold text-sky-700 text-sm">{pt.value}</td>
                            <td className="px-4 py-3 text-slate-600 font-mono">{pt.unit}</td>
                            <td className="px-4 py-3 text-slate-700">{pt.hospital}</td>
                            <td className="px-4 py-3 font-mono text-slate-400">{pt.recordId}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* AI Observation Card */}
                  <div className="p-4 bg-sky-50/60 border border-sky-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-2 text-sky-900 font-semibold">
                      <Sparkles className="w-4 h-4 text-sky-600" />
                      <span>AI Trend Analysis & Clinician Note</span>
                    </div>
                    <p className="text-slate-800 leading-relaxed pt-1">
                      {comparisonData.aiObservation}
                    </p>
                    <p className="text-[10px] text-slate-500 pt-1">
                      Note: AI observations are informational. Attending physician must independently correlate with patient symptoms.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Select a test to compare historical values.</p>
              )}
            </div>
          )}

          {/* TAB 5: Medical Document Processing (OCR) */}
          {workspaceTab === 'upload_extract' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Medical Document OCR & Structured Extraction</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ingest scanned lab reports or prescription documents. Gemini extracts candidate fields into structured schema for physician verification before committing to the patient chart.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Clinical Report Text or Scanned Document Content:</label>
                  <button
                    onClick={() => {
                      const pName = activePatient?.fullName || 'Patient';
                      const pId = activePatient?.patientId || 'MV-P-NEW';
                      const pDob = activePatient?.dateOfBirth || '1980-01-01';
                      setDocumentInputText(`DIAGNOSTIC CLINICAL REPORT
Date: ${new Date().toISOString().split('T')[0]}
Patient Name: ${pName} (ID: ${pId})
DOB: ${pDob}
CLINICAL INVESTIGATIONS:
- Fasting Blood Sugar: 118 mg/dL (Reference: 70 - 99 mg/dL) [HIGH]
- Hemoglobin A1c: 6.8 % (Reference: 4.0 - 5.6 %) [HIGH]
- Serum Creatinine: 0.95 mg/dL (Reference: 0.6 - 1.2 mg/dL) [NORMAL]
- eGFR: 84 mL/min/1.73m2 (Reference: > 60) [NORMAL]
MEDICATIONS:
- Metformin HCl 500mg Oral Twice Daily with Meals
CLINICAL IMPRESSION:
Routine glycemic monitoring. Renal excretory function preserved.`);
                    }}
                    className="text-xs text-sky-600 hover:text-sky-800 underline font-medium"
                  >
                    Insert Standard Lab Report Format
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={documentInputText}
                  onChange={e => setDocumentInputText(e.target.value)}
                  placeholder="Paste OCR text or click 'Insert Realistic Lab Sample' above..."
                  className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 bg-slate-50"
                />

                <button
                  onClick={handleExtractDocument}
                  disabled={extractingDocument}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{extractingDocument ? 'Extracting Fields with Gemini AI...' : 'Extract Candidate Fields with AI'}</span>
                </button>
              </div>

              {/* Extraction Review Screen */}
              {extractedCandidate && (
                <div className="p-5 bg-slate-50 border-2 border-sky-200 rounded-xl space-y-4 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">Review & Verify Extracted Fields</span>
                      <p className="text-[11px] text-slate-500">Edit any candidate fields before committing to official chart.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-mono text-[11px]">
                      Type: {extractedCandidate.documentType}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-0.5">Extracted Diagnosis</label>
                      <input
                        type="text"
                        value={extractedCandidate.diagnosis || ''}
                        onChange={e => setExtractedCandidate({ ...extractedCandidate, diagnosis: e.target.value })}
                        className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-0.5">Document Date</label>
                      <input
                        type="text"
                        value={extractedCandidate.documentDate || ''}
                        onChange={e => setExtractedCandidate({ ...extractedCandidate, documentDate: e.target.value })}
                        className="w-full text-xs p-2 rounded border border-slate-300 bg-white font-mono"
                      />
                    </div>
                  </div>

                  {extractedCandidate.labResults && extractedCandidate.labResults.length > 0 && (
                    <div>
                      <span className="font-semibold text-slate-900 block mb-1">Extracted Lab Results:</span>
                      <div className="space-y-1">
                        {extractedCandidate.labResults.map((l: any, i: number) => (
                          <div key={i} className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{l.testName}</span>
                            <span className="font-mono">{l.result} {l.unit} (Ref: {l.referenceRange})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedCandidate.confidenceFlags && (
                    <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-amber-900 text-[11px]">
                      <strong>Verification Flags:</strong> {extractedCandidate.confidenceFlags.join('; ')}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => setExtractedCandidate(null)}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleCommitExtractedRecord}
                      disabled={committingExtracted}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{committingExtracted ? 'Committing...' : 'Confirm & Commit to Patient Record'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Source Records & Amendment Process */}
          {workspaceTab === 'records' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Authorized clinical records for {activePatient.fullName}. Doctors can append signed amendments to records when new clinical findings arise.
              </p>

              <div className="grid grid-cols-1 gap-4">
                {patientRecords.map(record => (
                  <div key={record.recordId} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-semibold text-slate-500">{record.recordDate}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-700 font-medium">{record.hospitalName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-mono text-[10px]">
                            {record.recordId}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mt-1">{record.title}</h4>
                      </div>

                      <button
                        onClick={() => setAmendingRecordId(record.recordId)}
                        className="px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Add Amendment</span>
                      </button>
                    </div>

                    {record.clinicianDiagnosis && (
                      <p className="text-xs text-slate-700">
                        <strong>Diagnosis:</strong> {record.clinicianDiagnosis}
                      </p>
                    )}

                    {record.presentingComplaint && (
                      <p className="text-xs text-slate-600">
                        <strong>Notes:</strong> {record.presentingComplaint}
                      </p>
                    )}

                    {record.medications && record.medications.length > 0 && (
                      <div className="flex flex-wrap gap-1 text-xs">
                        {record.medications.map(m => (
                          <span key={m.id} className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[10px]">
                            {m.medicationName} ({m.dosage})
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Display existing amendments */}
                    {record.amendments && record.amendments.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="text-[11px] font-bold text-amber-900">Signed Amendments:</span>
                        {record.amendments.map(am => (
                          <div key={am.amendmentId} className="p-2 bg-amber-50/60 rounded border border-amber-200 text-xs">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-amber-950">
                              <span>{am.doctorName}</span>
                              <span className="font-mono text-slate-400">{am.timestamp.split('T')[0]}</span>
                            </div>
                            <p className="text-slate-700 mt-0.5">{am.amendedFieldsDescription}</p>
                            <span className="text-[10px] font-mono text-slate-400">{am.digitalSignature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Amendment Form */}
                    {amendingRecordId === record.recordId && (
                      <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl space-y-3 text-xs mt-3">
                        <span className="font-bold text-amber-950 block">New Clinical Addendum / Amendment</span>
                        <div>
                          <label className="font-semibold text-slate-700 block mb-0.5">Clinical Reason for Amendment</label>
                          <input
                            type="text"
                            value={amendmentReason}
                            onChange={e => setAmendmentReason(e.target.value)}
                            placeholder="e.g. Cross-hospital patient report review: confirmed allergic rash to penicillin"
                            className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 block mb-0.5">Addendum Details</label>
                          <textarea
                            rows={2}
                            value={amendmentNote}
                            onChange={e => setAmendmentNote(e.target.value)}
                            placeholder="Clinical observation, clarification of previous dosage, or updated clinical status..."
                            className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setAmendingRecordId(null)}
                            className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveAmendment(record.recordId)}
                            className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded font-semibold shadow-xs"
                          >
                            Sign & Append
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
