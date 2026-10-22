import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { DemoScenarioGuide } from './components/DemoScenarioGuide.js';
import { LandingPage } from './components/LandingPage.js';
import { PatientPortal } from './components/PatientPortal.js';
import { DoctorWorkspace } from './components/DoctorWorkspace.js';
import { HospitalAdminPortal } from './components/HospitalAdminPortal.js';
import { SystemAdminPortal } from './components/SystemAdminPortal.js';
import { RegistrationModal } from './components/RegistrationModal.js';
import { api, Persona } from './services/api.js';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
  const [registerRole, setRegisterRole] = useState<'patient' | 'doctor' | 'hospital_admin' | 'system_admin'>('patient');

  useEffect(() => {
    loadInitialPersonas();
  }, []);

  const loadInitialPersonas = async () => {
    try {
      const list = await api.getPersonas();
      setPersonas(list);

      if (list.length > 0) {
        const initial = list[0];
        setActivePersona(initial);
        await checkConsentAndRequests(initial);
      }
    } catch (err) {
      console.error('Failed to load personas:', err);
    }
  };

  const checkConsentAndRequests = async (personaToCheck: Persona | null = activePersona) => {
    try {
      if (personaToCheck && personaToCheck.role === 'patient' && personaToCheck.patientId) {
        const reqs = await api.getAccessRequests(personaToCheck.patientId);
        const pending = reqs.filter(r => r.status === 'pending');
        setPendingRequestsCount(pending.length);
      } else {
        setPendingRequestsCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectPersona = (persona: Persona) => {
    setActivePersona(persona);
    if (persona.role === 'patient') {
      setCurrentTab('patient');
      checkConsentAndRequests(persona);
    } else if (persona.role === 'doctor') {
      setCurrentTab('doctor');
      setPendingRequestsCount(0);
    } else if (persona.role === 'hospital_admin') {
      setCurrentTab('hospital_admin');
      setPendingRequestsCount(0);
    } else if (persona.role === 'system_admin') {
      setCurrentTab('system_admin');
      setPendingRequestsCount(0);
    }
  };

  const handleOpenRegister = (role: 'patient' | 'doctor' | 'hospital_admin' | 'system_admin' = 'patient') => {
    setRegisterRole(role);
    setIsRegisterOpen(true);
  };

  const handleRegistered = (newPersona: Persona) => {
    setPersonas(prev => {
      const exists = prev.some(p => p.uid === newPersona.uid);
      return exists ? prev : [...prev, newPersona];
    });
    handleSelectPersona(newPersona);
  };

  const handleClearData = async () => {
    try {
      await api.clearAllData();
      setPersonas([]);
      setActivePersona(null);
      setPendingRequestsCount(0);
      setCurrentTab('overview');
    } catch (err) {
      console.error('Failed to clear database:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-sky-100 selection:text-sky-900">
      {/* 3-Zone Header with Brand, Navigation Tabs, and Account Switcher */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        personas={personas}
        activePersona={activePersona}
        onSelectPersona={handleSelectPersona}
        pendingRequestCount={pendingRequestsCount}
        onOpenRegister={() => handleOpenRegister('patient')}
        onClearData={handleClearData}
      />

      {/* Live System Registry Status Bar */}
      <DemoScenarioGuide
        activePersona={activePersona}
        onSelectPersona={handleSelectPersona}
        personas={personas}
        onNavigateTab={setCurrentTab}
        onOpenRegister={() => handleOpenRegister('patient')}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'overview' && (
          <LandingPage
            onNavigateTab={setCurrentTab}
            personas={personas}
            onSelectPersona={handleSelectPersona}
            onOpenRegister={() => handleOpenRegister('patient')}
          />
        )}

        {currentTab === 'patient' && (
          <PatientPortal
            patientId={activePersona?.role === 'patient' ? (activePersona.patientId || '') : ''}
            onRequestStatusChange={() => checkConsentAndRequests(activePersona)}
            onOpenRegister={() => handleOpenRegister('patient')}
          />
        )}

        {currentTab === 'doctor' && (
          <DoctorWorkspace
            activeDoctorPersona={activePersona || { uid: '', name: 'Unauthenticated Clinician', role: 'doctor', subtitle: '', avatar: '?' }}
            onRequestStatusChange={() => checkConsentAndRequests(activePersona)}
            onOpenRegister={handleOpenRegister}
          />
        )}

        {currentTab === 'hospital_admin' && (
          <HospitalAdminPortal
            activeAdminPersona={activePersona || { uid: '', name: 'Hospital Administrator', role: 'hospital_admin', subtitle: '', avatar: 'HA' }}
          />
        )}

        {currentTab === 'system_admin' && (
          <SystemAdminPortal
            activeAdminPersona={activePersona || { uid: '', name: 'System Auditor', role: 'system_admin', subtitle: '', avatar: 'SA' }}
          />
        )}
      </main>

      {/* Account Registration Modal */}
      <RegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegistered={handleRegistered}
        defaultRole={registerRole}
      />

      {/* Clean Production Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">MediVault AI</span>
              <span>·</span>
              <span>Intelligent Cross-Hospital Medical History Management</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span>Verified Patient Consent Required</span>
              <span>·</span>
              <span>Zero Unaudited Access</span>
              <span>·</span>
              <span>Gemini 3.8 Flash Clinical Engine</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
