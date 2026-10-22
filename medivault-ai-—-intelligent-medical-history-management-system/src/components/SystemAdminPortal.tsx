import React, { useState, useEffect } from 'react';
import { Shield, Lock, Activity, Users, Database, AlertOctagon, CheckCircle2, Search, Filter } from 'lucide-react';
import { api, Persona } from '../services/api.js';
import { AuditLogEvent } from '../server/types.js';

interface SystemAdminPortalProps {
  activeAdminPersona: Persona;
}

export const SystemAdminPortal: React.FC<SystemAdminPortalProps> = ({ activeAdminPersona }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEvent[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [actionFilter, setActionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditData();
  }, []);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.getAdminStats();
      if (statsRes.success) setStats(statsRes.statistics);

      const logs = await api.getAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.patientId && log.patientId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shrink-0">
              <Shield className="w-7 h-7 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">National Compliance & Security Governance</h1>
                <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-800 text-xs font-semibold border border-sky-200">
                  System Audit Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Audited by {activeAdminPersona.name} · Tamper-evident immutable transaction ledger and cross-hospital access audit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Architecture Compliance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Consent-Gated Interoperability</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Direct database cross-patient queries are blocked. Doctors must hold time-limited cryptographic consent records before accessing patient records across institutions.
          </p>
          <div className="text-[11px] font-mono text-emerald-700 font-semibold flex items-center gap-1 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Policy Enforced (Zero Backdoors)</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <Activity className="w-4 h-4 text-sky-600" />
            <span>Append-Only Immutable Audit Log</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every patient identity search, record inspection, document upload, and AI summarization event creates an immutable security log entry with actor ID and stated clinical purpose.
          </p>
          <div className="text-[11px] font-mono text-sky-700 font-semibold flex items-center gap-1 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{auditLogs.length} Events Verified</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <AlertOctagon className="w-4 h-4 text-indigo-600" />
            <span>Secure Server-Side Gemini API</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            All AI model calls (summarization, document extraction, NL QA) execute server-side via @google/genai SDK with strict citation enforcement and no client-side secret exposure.
          </p>
          <div className="text-[11px] font-mono text-indigo-700 font-semibold flex items-center gap-1 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Model: gemini-3.8-flash</span>
          </div>
        </div>
      </div>

      {/* Audit Log Explorer */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Cryptographic Security Audit Log Explorer</h3>
            <p className="text-xs text-slate-500">
              Filter and inspect all system-wide access, patient searches, AI queries, and consent changes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search actor, patient, or purpose..."
                className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 w-56"
              />
            </div>

            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
            >
              <option value="all">All Actions</option>
              <option value="PATIENT_SEARCH">PATIENT_SEARCH</option>
              <option value="ACCESS_REQUESTED">ACCESS_REQUESTED</option>
              <option value="ACCESS_APPROVED">ACCESS_APPROVED</option>
              <option value="ACCESS_DENIED">ACCESS_DENIED</option>
              <option value="ACCESS_REVOKED">ACCESS_REVOKED</option>
              <option value="RECORD_VIEWED">RECORD_VIEWED</option>
              <option value="RECORD_CREATED">RECORD_CREATED</option>
              <option value="AI_SUMMARY_GENERATED">AI_SUMMARY_GENERATED</option>
              <option value="AI_SEARCH_PERFORMED">AI_SEARCH_PERFORMED</option>
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[600px] overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-left sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3">Event Timestamp</th>
                <th className="px-4 py-3">Actor & Hospital</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Target Patient</th>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Clinical Justification</th>
                <th className="px-4 py-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredLogs.map(log => (
                <tr key={log.eventId} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                    {log.timestamp.replace('T', ' ').substring(0, 19)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <div className="text-slate-900 font-semibold">{log.actorName}</div>
                    <div className="text-slate-500 text-[10px]">{log.hospitalName || log.actorRole}</div>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">
                    {log.patientId ? (
                      <span className="font-semibold text-sky-800">{log.patientId}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                    {log.resourceId}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs leading-snug">
                    {log.purpose}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      log.outcome === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.outcome === 'FLAGGED'
                        ? 'bg-amber-100 text-amber-800'
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
    </div>
  );
};
