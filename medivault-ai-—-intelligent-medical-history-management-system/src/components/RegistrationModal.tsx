import React, { useState } from 'react';
import { UserPlus, Stethoscope, Building2, Shield, User, X } from 'lucide-react';
import { api, Persona } from '../services/api.js';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: (newPersona: Persona) => void;
  defaultRole?: 'patient' | 'doctor' | 'hospital_admin' | 'system_admin';
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegistered,
  defaultRole = 'patient',
}) => {
  const [role, setRole] = useState<'patient' | 'doctor' | 'hospital_admin' | 'system_admin'>(defaultRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Patient fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [address, setAddress] = useState('');
  const [allergen, setAllergen] = useState('');
  const [allergyReaction, setAllergyReaction] = useState('');
  const [condition, setCondition] = useState('');

  // Doctor fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialization, setSpecialization] = useState('Internal Medicine');
  const [hospitalName, setHospitalName] = useState('');

  // Hospital Admin fields
  const [hospRegNumber, setHospRegNumber] = useState('');
  const [city, setCity] = useState('');

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Please enter a full name.');
      return;
    }

    setLoading(true);
    try {
      let payload: any = { role, fullName, email, phone };

      if (role === 'patient') {
        if (!dateOfBirth) {
          alert('Please provide Date of Birth for patient identity matching.');
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          dateOfBirth,
          gender,
          bloodGroup,
          address,
          knownAllergies: allergen.trim() ? [{ allergen: allergen.trim(), severity: 'Moderate', reaction: allergyReaction.trim() || 'Allergic sensitivity', documentedDate: new Date().toISOString().split('T')[0] }] : [],
          existingConditions: condition.trim() ? [{ condition: condition.trim(), diagnosedDate: new Date().toISOString().split('T')[0], status: 'Active' }] : [],
        };
      } else if (role === 'doctor') {
        if (!licenseNumber.trim()) {
          alert('Medical Council License Number is required for doctor verification.');
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          professionalRegistrationNumber: licenseNumber.trim(),
          specialization: specialization.trim(),
          primaryHospitalName: hospitalName.trim() || 'General Medical Hospital',
        };
      } else if (role === 'hospital_admin') {
        if (!hospitalName.trim()) {
          alert('Hospital name is required.');
          setLoading(false);
          return;
        }
        payload = {
          ...payload,
          hospitalName: hospitalName.trim(),
          registrationNumber: hospRegNumber.trim(),
          city: city.trim(),
        };
      }

      const res = await api.register(payload);
      if (res.success) {
        const u = res.user;
        const initials = u.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
        const newPersona: Persona = {
          uid: u.uid,
          name: u.fullName,
          role: u.role,
          patientId: u.patientId,
          doctorId: u.doctorId,
          hospitalName: u.hospitalId ? hospitalName : undefined,
          subtitle: u.role === 'patient' ? `Patient (${u.patientId})` : u.role === 'doctor' ? `Doctor (${u.doctorId})` : u.role,
          avatar: initials,
        };
        onRegistered(newPersona);
        onClose();
      } else {
        alert(`Registration failed: ${res.error || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Registration error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Register New Account</h3>
              <p className="text-xs text-slate-500">Create real patient, doctor, or hospital profiles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 text-sm font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          {[
            { id: 'patient', label: 'Patient', icon: User },
            { id: 'doctor', label: 'Doctor', icon: Stethoscope },
            { id: 'hospital_admin', label: 'Hospital', icon: Building2 },
            { id: 'system_admin', label: 'Auditor', icon: Shield },
          ].map(r => {
            const Icon = r.icon;
            const isSelected = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id as any)}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50 text-sky-900 font-semibold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                <span className="text-[11px]">{r.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Common Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                {role === 'hospital_admin' ? 'Administrator Full Name *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Dr. Jane Doe or John Smith"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Contact Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Patient-Specific Fields */}
          {role === 'patient' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={e => setBloodGroup(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street address, city"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Known Allergies (Optional)</label>
                  <input
                    type="text"
                    value={allergen}
                    onChange={e => setAllergen(e.target.value)}
                    placeholder="e.g. Penicillin, Aspirin, Shellfish"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Allergic Reaction / Symptoms</label>
                  <input
                    type="text"
                    value={allergyReaction}
                    onChange={e => setAllergyReaction(e.target.value)}
                    placeholder="e.g. Rash, Hives, Anaphylaxis"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Existing Medical Conditions (Optional)</label>
                <input
                  type="text"
                  value={condition}
                  onChange={e => setCondition(e.target.value)}
                  placeholder="e.g. Hypertension, Asthma, Type 2 Diabetes"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>
          )}

          {/* Doctor-Specific Fields */}
          {role === 'doctor' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Medical Registration Number *</label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={e => setLicenseNumber(e.target.value)}
                    placeholder="e.g. MED-NYC-94812"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Specialization</label>
                  <input
                    type="text"
                    value={specialization}
                    onChange={e => setSpecialization(e.target.value)}
                    placeholder="e.g. Cardiology, Pulmonology, Pediatrics"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Primary Affiliated Hospital / Clinic</label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={e => setHospitalName(e.target.value)}
                  placeholder="e.g. Central Memorial Hospital"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>
          )}

          {/* Hospital-Specific Fields */}
          {role === 'hospital_admin' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Hospital / Medical Center Name *</label>
                <input
                  type="text"
                  required
                  value={hospitalName}
                  onChange={e => setHospitalName(e.target.value)}
                  placeholder="e.g. St. Luke's Health Center"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Hospital Registration Number</label>
                  <input
                    type="text"
                    value={hospRegNumber}
                    onChange={e => setHospRegNumber(e.target.value)}
                    placeholder="e.g. HOSP-REG-4401"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City / Region</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Chicago, IL"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{loading ? 'Registering...' : 'Create Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
