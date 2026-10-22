import React from 'react';
import {
  Shield,
  Building2,
  FileText,
  Sparkles,
  Lock,
  ArrowRight,
  CheckCircle,
  Activity,
  AlertTriangle,
  UserCheck,
  Stethoscope,
  UserPlus
} from 'lucide-react';
import { Persona } from '../services/api.js';

interface LandingPageProps {
  onNavigateTab: (tab: string) => void;
  personas: Persona[];
  onSelectPersona: (persona: Persona) => void;
  onOpenRegister?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateTab,
  personas,
  onSelectPersona,
  onOpenRegister,
}) => {
  const patientPersona = personas.find(p => p.role === 'patient');
  const doctorPersona = personas.find(p => p.role === 'doctor');
  const hospAdminPersona = personas.find(p => p.role === 'hospital_admin');
  const sysAdminPersona = personas.find(p => p.role === 'system_admin');

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-sky-50 text-sky-800 text-xs font-semibold border border-sky-100">
              <Shield className="w-3.5 h-3.5 text-sky-600" />
              <span>Consent-Driven Healthcare Interoperability</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Intelligent Medical History Management Across Hospitals
            </h1>

            <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
              Eliminate dangerous clinical silos. MediVault AI empowers patients to securely share past clinical records with authorized physicians at new hospitals, while Gemini AI provides structured, cited clinical summaries for attending doctors.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {personas.length === 0 ? (
                <button
                  onClick={onOpenRegister}
                  className="px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register First Account</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (doctorPersona) onSelectPersona(doctorPersona);
                      onNavigateTab('doctor');
                    }}
                    className="px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Open Doctor Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (patientPersona) onSelectPersona(patientPersona);
                      onNavigateTab('patient');
                    }}
                    className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Open Patient Portal
                  </button>
                </>
              )}
            </div>

            {/* Trust points */}
            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Zero Direct DB Bypass</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Time-Limited Patient Consent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Evidence-Cited AI Summaries</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100">
              <img
                src="/src/assets/images/hero_clinical_network_1792567271127.jpg"
                alt="MediVault AI Interoperability Network"
                className="w-full h-80 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="p-4 bg-white/95 backdrop-blur-xs border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>Cross-Hospital Clinical Data Interchange</span>
                  <span className="text-emerald-700 font-mono">Status: Secure</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Cross-hospital verification protocol active with end-to-end cryptographic audit trails.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The Core Problem & Solution */}
      <div className="bg-slate-50 py-12 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Overcoming Fragmented Medical History</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              When a patient presents to a new hospital, doctors often lack critical historical records, risking adverse medication reactions, redundant radiation exposure, and delayed interventions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Inter-Facility Silos</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hospitals often operate isolated electronic health record systems. Patients are forced to carry fragile paper summaries or repeat costly diagnostic blood tests.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Patient-Mediated Consent</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Doctors at new hospitals request access stating specific clinical justification. Patients approve or deny requests directly, with granular time limits and instant revocation.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Clinician-Reviewed AI</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gemini 3.8 Flash synthesizes records into a 10-point clinical timeline, segregates active from discontinued drugs, and highlights missing data with strict source record citations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Based Portals */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Platform Portals & Capabilities</h2>
          <p className="text-xs text-slate-500 mt-1">
            Access secure role-based portals for patients, clinicians, and health system administrators.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Patient Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-sky-300 transition-all shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-sm">
                PT
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Patient Portal</h3>
              <p className="text-xs text-slate-600 leading-snug">
                Maintain personal medical records, review incoming access requests, approve or revoke doctor access, and view AI-explained terminology.
              </p>
            </div>
            <button
              onClick={() => {
                if (patientPersona) onSelectPersona(patientPersona);
                onNavigateTab('patient');
              }}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Enter Patient Portal
            </button>
          </div>

          {/* Doctor Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-sky-300 transition-all shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
                DR
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Doctor Workspace</h3>
              <p className="text-xs text-slate-600 leading-snug">
                Search patients by ID & DOB, request cross-hospital access, review 10-point AI summaries, run clinical Q&A, and extract document data with OCR.
              </p>
            </div>
            <button
              onClick={() => {
                if (doctorPersona) onSelectPersona(doctorPersona);
                onNavigateTab('doctor');
              }}
              className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Enter Doctor Workspace
            </button>
          </div>

          {/* Hospital Admin Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-sky-300 transition-all shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                HA
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Hospital Administration</h3>
              <p className="text-xs text-slate-600 leading-snug">
                Manage medical staff credentials, verify physician licenses, review facility access statistics, and inspect departmental compliance logs.
              </p>
            </div>
            <button
              onClick={() => {
                if (hospAdminPersona) onSelectPersona(hospAdminPersona);
                onNavigateTab('hospital_admin');
              }}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Hospital Admin Portal
            </button>
          </div>

          {/* System Administrator */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-sky-300 transition-all shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm">
                SA
              </div>
              <h3 className="font-bold text-slate-900 text-sm">System Compliance Auditor</h3>
              <p className="text-xs text-slate-600 leading-snug">
                Inspect the cryptographic tamper-evident audit trail, review physician verification status, and enforce zero-bypass data protection policies.
              </p>
            </div>
            <button
              onClick={() => {
                if (sysAdminPersona) onSelectPersona(sysAdminPersona);
                onNavigateTab('system_admin');
              }}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Inspect Security Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
