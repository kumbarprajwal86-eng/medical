import React, { useState, useEffect } from 'react';
import { Building2, ShieldCheck, Users, Activity, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { api, Persona } from '../services/api.js';
import { DoctorProfile, Hospital, AuditLogEvent } from '../server/types.js';

interface HospitalAdminPortalProps {
  activeAdminPersona: Persona;
}

export const HospitalAdminPortal: React.FC<HospitalAdminPortalProps> = ({ activeAdminPersona }) => {
  const [stats, setStats] = useState<any | null>(null);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.getAdminStats();
      if (statsRes.success) {
        setStats(statsRes.statistics);
        setDoctors(statsRes.doctors || []);
        setHospitals(statsRes.hospitals || []);
      }
      const logs = await api.getAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDoctor = async (doctorId: string) => {
    try {
      await api.verifyDoctor(doctorId, 'verified');
      await loadData();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hospital Admin Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-sky-50 border border-sky-100 text-sky-800 flex items-center justify-center font-bold text-xl shrink-0">
              <Building2 className="w-7 h-7 text-sky-700" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">Hospital Administration & Credentialing</h1>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono">
                  {activeAdminPersona.hospitalName || 'Institutional Health System'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Institutional governance: Staff credential verification, operational metrics, and departmental privacy audit compliance.
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Registry</span>
          </button>
        </div>
      </div>

      {/* Privacy Notice: Administrators Do Not Have Automatic Clinical Bypass */}
      <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-semibold text-sky-900">Zero Clinical Bypass Architecture:</strong>{' '}
          In compliance with medical data privacy legislation (HIPAA & DPDP Act), hospital administrators do not possess back-door or unrestricted read access to patient private medical notes. Access to clinical records is strictly confined to licensed physicians holding authenticated patient consent.
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs text-slate-500">Verified Medical Staff</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{stats.verifiedDoctors} / {stats.totalDoctors}</div>
            <span className="text-[11px] text-emerald-600 font-medium">100% License Checked</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs text-slate-500">Clinical Records Ingested</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{stats.totalRecords}</div>
            <span className="text-[11px] text-slate-500">Across 2 Participating Hospitals</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs text-slate-500">Active Patient Consents</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{stats.activeConsents}</div>
            <span className="text-[11px] text-sky-600 font-medium">Time-limited authorizations</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs text-slate-500">Security Audit Events</span>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{stats.totalAuditEvents}</div>
            <span className="text-[11px] text-slate-500">Immutable ledger log</span>
          </div>
        </div>
      )}

      {/* Medical Staff Directory */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Hospital Medical Staff & Physician Credentialing</h3>
          <p className="text-xs text-slate-500">
            Verify state medical licenses, affiliated departments, and authorization privileges.
          </p>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-left">
              <tr>
                <th className="px-4 py-3">Physician Name</th>
                <th className="px-4 py-3">Medical Council License</th>
                <th className="px-4 py-3">Specialization</th>
                <th className="px-4 py-3">Primary Hospital</th>
                <th className="px-4 py-3">Verification Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {doctors.map(doc => (
                <tr key={doc.doctorId} className="hover:bg-slate-50">
                  <td className="px-4 py-3.5 font-semibold text-slate-900">{doc.fullName}</td>
                  <td className="px-4 py-3.5 font-mono text-slate-600">{doc.professionalRegistrationNumber}</td>
                  <td className="px-4 py-3.5 text-slate-700">{doc.specialization}</td>
                  <td className="px-4 py-3.5 text-slate-600">{doc.primaryHospitalName}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      doc.verificationStatus === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {doc.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {doc.verificationStatus !== 'verified' ? (
                      <button
                        onClick={() => handleVerifyDoctor(doc.doctorId)}
                        className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      >
                        Verify License
                      </button>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">Authorized</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hospital Security Audit Log */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Institutional Access & Activity Logs</h3>
          <p className="text-xs text-slate-500">
            Real-time audit records of patient searches, record views, and cross-hospital consent events.
          </p>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-left sticky top-0">
              <tr>
                <th className="px-4 py-2.5">Time</th>
                <th className="px-4 py-2.5">Actor</th>
                <th className="px-4 py-2.5">Action</th>
                <th className="px-4 py-2.5">Patient ID</th>
                <th className="px-4 py-2.5">Purpose</th>
                <th className="px-4 py-2.5">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {auditLogs.slice(0, 15).map(log => (
                <tr key={log.eventId} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                    {log.timestamp.replace('T', ' ').substring(0, 19)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{log.actorName}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-slate-700">{log.action}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-600">{log.patientId || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{log.purpose}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      log.outcome === 'SUCCESS' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
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
    </div>
  );
};
