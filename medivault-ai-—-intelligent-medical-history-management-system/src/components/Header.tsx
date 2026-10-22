import React, { useState } from 'react';
import { Shield, ChevronDown, UserCheck, Lock, Activity, RefreshCw } from 'lucide-react';
import { Persona } from '../services/api.js';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  personas: Persona[];
  activePersona: Persona | null;
  onSelectPersona: (persona: Persona) => void;
  pendingRequestCount: number;
  onOpenRegister: () => void;
  onClearData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  personas,
  activePersona,
  onSelectPersona,
  pendingRequestCount,
  onOpenRegister,
  onClearData,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinks = [
    { id: 'overview', label: 'Overview' },
    { id: 'patient', label: 'Patient Portal', badge: pendingRequestCount > 0 ? pendingRequestCount : null },
    { id: 'doctor', label: 'Doctor Workspace' },
    { id: 'hospital_admin', label: 'Hospital Admin' },
    { id: 'system_admin', label: 'System Audit' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <button
            onClick={() => onTabChange('overview')}
            className="flex items-center gap-2.5 text-left text-slate-900 group shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                MediVault <span className="text-sky-600">AI</span>
              </span>
            </div>
          </button>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            {navLinks.map(link => {
              const isActive = currentTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onTabChange(link.id)}
                  className={`relative px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-100 text-sky-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center tabular-nums">
                      {link.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action (Persona Switcher & Register) */}
          <div className="relative shrink-0 flex items-center gap-2">
            <button
              onClick={onOpenRegister}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              + Register Account
            </button>

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {activePersona ? activePersona.avatar : '—'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-semibold leading-tight truncate max-w-[120px]">
                    {activePersona ? activePersona.name : 'No Account'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Registered Accounts</span>
                      <span className="text-[10px] text-slate-400 font-mono">{personas.length} Active</span>
                    </div>

                    <div className="py-1 space-y-1 max-h-64 overflow-y-auto">
                      {personas.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500">
                          No accounts registered yet.
                        </div>
                      ) : (
                        personas.map(p => {
                          const isSelected = activePersona?.uid === p.uid;
                          return (
                            <button
                              key={p.uid}
                              onClick={() => {
                                onSelectPersona(p);
                                setDropdownOpen(false);
                              }}
                              className={`w-full text-left p-2.5 rounded-lg text-xs flex items-start gap-2.5 transition-colors ${
                                isSelected
                                  ? 'bg-sky-50 text-sky-900 font-medium border border-sky-100'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0 mt-0.5 text-xs">
                                {p.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-900 truncate">{p.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-medium uppercase">
                                    {p.role.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="text-slate-500 text-[11px] mt-0.5 leading-snug line-clamp-1">
                                  {p.subtitle}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenRegister();
                        }}
                        className="w-full py-2 text-center text-xs font-semibold text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      >
                        + Create Another Profile
                      </button>
                      {personas.length > 0 && onClearData && (
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            if (window.confirm('Clear all patient and doctor records from the system?')) {
                              onClearData();
                            }
                          }}
                          className="w-full mt-1 py-1 text-center text-[11px] text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          Clear All Data
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
