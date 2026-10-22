import React from 'react';
import { Shield, UserPlus, Users, Stethoscope, Building2, User } from 'lucide-react';
import { Persona } from '../services/api.js';

interface DemoScenarioGuideProps {
  activePersona: Persona | null;
  onSelectPersona: (persona: Persona) => void;
  personas: Persona[];
  onNavigateTab: (tab: string) => void;
  onOpenRegister: () => void;
}

export const DemoScenarioGuide: React.FC<DemoScenarioGuideProps> = ({
  activePersona,
  onSelectPersona,
  personas,
  onNavigateTab,
  onOpenRegister,
}) => {
  return (
    <div className="bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold tracking-wide border border-emerald-400/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Live System Registry</span>
            </div>
            {personas.length === 0 ? (
              <p className="text-slate-300 text-xs">
                Zero mock data loaded. Register your first patient, doctor, or medical institution to get started.
              </p>
            ) : (
              <p className="text-slate-300 text-xs">
                Active Session:{' '}
                <strong className="text-white font-medium">
                  {activePersona ? `${activePersona.name} (${activePersona.role.replace('_', ' ')})` : 'Select an Account'}
                </strong>
                <span className="text-slate-500 mx-2">·</span>
                <span className="text-slate-400 font-mono">{personas.length} Registered User{personas.length === 1 ? '' : 's'}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {personas.length === 0 ? (
              <button
                onClick={onOpenRegister}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-md font-medium text-xs transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register First User</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px]">Quick Switch:</span>
                {personas.slice(0, 3).map(p => (
                  <button
                    key={p.uid}
                    onClick={() => {
                      onSelectPersona(p);
                      if (p.role === 'patient') onNavigateTab('patient');
                      else if (p.role === 'doctor') onNavigateTab('doctor');
                      else if (p.role === 'hospital_admin') onNavigateTab('hospital_admin');
                      else onNavigateTab('system_admin');
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors truncate max-w-[130px] ${
                      activePersona?.uid === p.uid
                        ? 'bg-sky-600 text-white font-medium'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {p.name.split(' ')[0]} ({p.role.slice(0, 3)})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
