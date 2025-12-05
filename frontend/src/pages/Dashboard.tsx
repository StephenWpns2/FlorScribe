import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import patientsService from '../services/patients';
import type { Patient, CreatePatientDto, UpdatePatientDto } from '../types/patient';
import PatientForm from '../components/PatientForm';
import FileUpload from '../components/FileUpload';
import UsageDisplay from '../components/UsageDisplay';
import HIPAAComplianceBadge from '../components/HIPAAComplianceBadge';
import UserProfile from '../components/UserProfile';
import FlorenceLogo from '../components/FlorenceLogo';

interface User {
  email: string;
  name?: string | null;
  id?: number;
}

interface Session {
  id: number;
  user_id: number;
  user_email: string;
  patient_id: string | null;
  patient_name: string | null;
  patient_entity_id: number | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
  hospital_patient_id?: string | null;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'sessions' | 'patients'>('sessions');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSessions, setPatientSessions] = useState<Session[]>([]);
  const [loadingPatientSessions, setLoadingPatientSessions] = useState(false);
  const [showHIPAAModal, setShowHIPAAModal] = useState(false);
  
  const navigate = useNavigate();

  // Auth Check & Fetch Sessions
  useEffect(() => {
    const fetchData = async () => {
      const isDemoMode = localStorage.getItem('demo_mode') === 'true';
      if (isDemoMode) {
        setUser({ email: 'demo@florence.ai' });
        setLoading(false);
        return;
      }

      try {
        const userResponse = await api.get('/api/auth/me');
        setUser(userResponse.data);
        
        // Fetch sessions for current user
        const sessionsResponse = await api.get('/api/admin/sessions', {
          params: {
            user_id: userResponse.data.id,
            limit: 100
          }
        });
        const sessionsData = sessionsResponse.data.sessions || [];
        
        // Fetch patient data for sessions that have patient_entity_id
        const patientEntityIds = sessionsData
          .filter((s: Session) => s.patient_entity_id)
          .map((s: Session) => s.patient_entity_id) as number[];
        
        if (patientEntityIds.length > 0) {
          const uniqueIds = [...new Set(patientEntityIds)];
          const patientPromises = uniqueIds.map(id => 
            patientsService.getPatient(id).catch(() => null)
          );
          const patients = await Promise.all(patientPromises);
          const map = new Map<number, Patient>();
          patients.forEach(patient => {
            if (patient) {
              map.set(patient.id, patient);
            }
          });
          
          // Enrich sessions with hospital patient ID
          const enrichedSessions = sessionsData.map((session: Session) => {
            if (session.patient_entity_id && map.has(session.patient_entity_id)) {
              const patient = map.get(session.patient_entity_id)!;
              return { ...session, hospital_patient_id: patient.patientId || null };
            }
            return { ...session, hospital_patient_id: session.patient_id };
          });
          setSessions(enrichedSessions);
        } else {
          setSessions(sessionsData);
        }
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { status?: number } };
          if (axiosError.response?.status === 401) {
            navigate('/auth');
          } else {
            setError('Failed to load sessions');
          }
        } else {
          setError('Failed to load sessions');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const fetchPatients = useCallback(async () => {
    try {
      const response = await patientsService.getPatients(0, 100, searchQuery || undefined);
      setPatients(response.patients || []);
    } catch {
      setError('Failed to load patients');
    }
  }, [searchQuery]);

  // Fetch patients when view changes to patients
  useEffect(() => {
    if (view === 'patients') {
      fetchPatients();
    }
  }, [view, fetchPatients]);

  const handleCreatePatient = async (data: CreatePatientDto | UpdatePatientDto) => {
    // Ensure required fields are present for creation
    if (!data.firstName || !data.lastName || !data.phoneNumber) {
      throw new Error('First name, last name, and phone number are required');
    }
    await patientsService.createPatient(data as CreatePatientDto);
    setShowAddPatient(false);
    fetchPatients();
  };

  const handleImportPatients = async (file: File) => {
    const result = await patientsService.importPatients(file);
    setShowImportModal(false);
    fetchPatients();
    return result;
  };

  const handleViewPatientSessions = async (patient: Patient) => {
    setSelectedPatient(patient);
    setLoadingPatientSessions(true);
    setError('');
    try {
      const response = await patientsService.getPatientSessions(patient.id);
      setPatientSessions(response.sessions || []);
    } catch {
      setError('Failed to load patient sessions');
    } finally {
      setLoadingPatientSessions(false);
    }
  };

  const handleClosePatientDetail = () => {
    setSelectedPatient(null);
    setPatientSessions([]);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('demo_mode');
    navigate('/auth');
  };

  const handleNewSession = () => {
    navigate('/session');
  };

  const handleHIPAABadgeClick = () => {
    setShowHIPAAModal(true);
  };

  // Auto-close HIPAA modal after 3 seconds
  useEffect(() => {
    if (showHIPAAModal) {
      const timer = setTimeout(() => {
        setShowHIPAAModal(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showHIPAAModal]);

  const handleViewSession = (sessionId: number) => {
    navigate(`/session?id=${sessionId}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status.toLowerCase()) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'ended':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0FDFF' }}>
      <nav className="bg-white shadow" style={{ borderBottom: '2px solid #42D7D7' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2 md:gap-4">
              <FlorenceLogo size="medium" showSlogan={true} />
              <div className="hidden md:block">
                <HIPAAComplianceBadge size="small" showText={true} onClick={handleHIPAABadgeClick} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Desktop: Show all items */}
              <div className="hidden md:flex items-center gap-4">
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-4 py-2 rounded-md font-medium transition-colors border-2"
                  style={{ borderColor: '#42D7D7', color: '#42D7D7' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#42D7D7';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = '#42D7D7';
                  }}
                >
                  Pricing
                </button>
                <UserProfile user={user} size="medium" />
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-md text-white font-medium transition-colors"
                  style={{ backgroundColor: '#42D7D7' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3BC5C5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#42D7D7'}
                >
                  Logout
                </button>
              </div>
              {/* Mobile: Show only user profile with menu */}
              <div className="md:hidden">
                <UserProfile 
                  user={user} 
                  size="medium" 
                  showMobileMenu={true}
                  onPricingClick={() => navigate('/pricing')}
                  onLogoutClick={handleLogout}
                  onHIPAAClick={handleHIPAABadgeClick}
                />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* HIPAA Compliance Modal */}
          {showHIPAAModal && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 border-2 border-green-200 animate-fade-in">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <HIPAAComplianceBadge size="large" showText={true} />
                    <div>
                      <h3 className="font-semibold text-green-800 text-lg">HIPAA Compliant</h3>
                      <p className="text-sm text-green-700 mt-1">
                        Your Protected Health Information is encrypted and secured according to HIPAA standards
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>HIPAA Compliance Details:</strong> All PHI is encrypted at rest (AES-256-GCM), transmitted over HTTPS/TLS, and all access is audited. See HIPAA_COMPLIANCE_DOCUMENTATION.md for details.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Usage Display */}
          <UsageDisplay />

          {/* View Toggle */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setView('sessions')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                view === 'sessions'
                  ? 'text-white'
                  : 'text-gray-700 bg-white border border-gray-300'
              }`}
              style={view === 'sessions' ? { backgroundColor: '#42D7D7' } : {}}
            >
              Sessions
            </button>
            <button
              onClick={() => setView('patients')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                view === 'patients'
                  ? 'text-white'
                  : 'text-gray-700 bg-white border border-gray-300'
              }`}
              style={view === 'patients' ? { backgroundColor: '#42D7D7' } : {}}
            >
              Patients
            </button>
          </div>

          {/* Header */}
          {view === 'sessions' ? (
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Sessions Overview</h2>
                <p className="text-gray-600 mt-1">Manage and view all your transcription sessions</p>
              </div>
              <button
                onClick={handleNewSession}
                className="px-6 py-3 rounded-lg text-white font-medium flex items-center transition-all transform hover:scale-105 shadow-lg"
                style={{ backgroundColor: '#42D7D7' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3BC5C5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#42D7D7'}
              >
                <span className="mr-2">+</span>
                New Session
              </button>
            </div>
          ) : (
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Patients</h2>
                <p className="text-gray-600 mt-1">Manage patient records</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-6 py-3 rounded-lg font-medium flex items-center transition-all transform hover:scale-105 shadow-lg border-2"
                  style={{ borderColor: '#42D7D7', color: '#42D7D7', backgroundColor: 'white' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#42D7D7';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = '#42D7D7';
                  }}
                >
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Import Patients
                </button>
                <button
                  onClick={() => setShowAddPatient(true)}
                  className="px-6 py-3 rounded-lg text-white font-medium flex items-center transition-all transform hover:scale-105 shadow-lg"
                  style={{ backgroundColor: '#42D7D7' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3BC5C5'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#42D7D7'}
                >
                  <span className="mr-2">+</span>
                  Add Patient
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Patient Search */}
          {view === 'patients' && (
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search patients by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#42D7D7]"
              />
            </div>
          )}

          {/* Add Patient Modal */}
          {showAddPatient && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4 border-2" style={{ borderColor: '#42D7D7' }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold" style={{ color: '#42D7D7' }}>Add New Patient</h3>
                  <button
                    onClick={() => setShowAddPatient(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <PatientForm
                  onSubmit={handleCreatePatient}
                  onCancel={() => setShowAddPatient(false)}
                />
              </div>
            </div>
          )}

          {/* Import Patients Modal */}
          {showImportModal && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4 border-2" style={{ borderColor: '#42D7D7' }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold" style={{ color: '#42D7D7' }}>Import Patients</h3>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <FileUpload onUpload={handleImportPatients} />
              </div>
            </div>
          )}

          {/* Patient Detail Modal */}
          {selectedPatient && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4 border-2" style={{ borderColor: '#42D7D7' }}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold" style={{ color: '#42D7D7' }}>
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </h3>
                    {selectedPatient.patientId && (
                      <p className="text-sm text-gray-500 mt-1">Hospital ID: {selectedPatient.patientId}</p>
                    )}
                  </div>
                  <button
                    onClick={handleClosePatientDetail}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600"><strong>Phone:</strong></p>
                    <p className="text-gray-900">{selectedPatient.phoneNumber}</p>
                  </div>
                  {selectedPatient.email && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600"><strong>Email:</strong></p>
                      <p className="text-gray-900">{selectedPatient.email}</p>
                    </div>
                  )}
                </div>
                <div className="mt-6">
                  <h4 className="text-lg font-bold mb-4" style={{ color: '#42D7D7' }}>
                    Sessions ({patientSessions.length})
                  </h4>
                  {loadingPatientSessions ? (
                    <div className="text-center py-8">
                      <svg className="animate-spin h-8 w-8 mx-auto text-[#42D7D7]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-gray-500 mt-2">Loading sessions...</p>
                    </div>
                  ) : patientSessions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No sessions found for this patient</p>
                  ) : (
                    <div className="space-y-3">
                      {patientSessions.map((session) => (
                        <div
                          key={session.id}
                          className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#42D7D7] transition-colors bg-white"
                          onClick={() => handleViewSession(session.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-gray-900">Session #{session.id}</span>
                              {session.started_at && (
                                <div className="text-sm text-gray-500 mt-1">
                                  {formatDate(session.started_at)}
                                </div>
                              )}
                            </div>
                            <span className={getStatusBadge(session.status)}>{session.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Patients List */}
          {view === 'patients' && (
            <>
              {loading ? (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                  <div className="text-gray-500">Loading patients...</div>
                </div>
              ) : patients.length === 0 ? (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center" style={{ border: '2px solid #42D7D7' }}>
                  <div className="text-gray-500 mb-4">No patients found</div>
                  <button
                    onClick={() => setShowAddPatient(true)}
                    className="px-6 py-2 rounded-md text-white font-medium"
                    style={{ backgroundColor: '#42D7D7' }}
                  >
                    Add Your First Patient
                  </button>
                </div>
              ) : (
                <>
                  {/* Patient Summary Cards */}
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow-lg p-6" style={{ border: '2px solid #42D7D7' }}>
                      <div className="text-sm text-gray-600">Total Patients</div>
                      <div className="text-2xl font-bold mt-2" style={{ color: '#42D7D7' }}>
                        {patients.length}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-lg p-6" style={{ border: '2px solid #42D7D7' }}>
                      <div className="text-sm text-gray-600">Patients with Hospital ID</div>
                      <div className="text-2xl font-bold mt-2" style={{ color: '#42D7D7' }}>
                        {patients.filter(p => p.patientId).length}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-lg p-6" style={{ border: '2px solid #42D7D7' }}>
                      <div className="text-sm text-gray-600">Patients with Email</div>
                      <div className="text-2xl font-bold mt-2" style={{ color: '#42D7D7' }}>
                        {patients.filter(p => p.email).length}
                      </div>
                    </div>
                  </div>

                  {/* Patients Table */}
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ border: '2px solid #42D7D7' }}>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Phone
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Patient ID
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {patients.map((patient) => (
                            <tr key={patient.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {patient.firstName} {patient.lastName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {patient.phoneNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {patient.email || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {patient.patientId || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => handleViewPatientSessions(patient)}
                                  className="text-[#42D7D7] hover:text-[#3BC5C5] transition-colors mr-4"
                                >
                                  View Sessions
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Sessions List */}
          {view === 'sessions' && (
            <>
              {loading ? (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                  <div className="text-gray-500">Loading sessions...</div>
                </div>
              ) : sessions.length === 0 ? (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center" style={{ border: '2px solid #42D7D7' }}>
                  <div className="text-gray-500 mb-4">No sessions found</div>
                  <button
                    onClick={handleNewSession}
                    className="px-6 py-2 rounded-md text-white font-medium"
                    style={{ backgroundColor: '#42D7D7' }}
                  >
                    Start Your First Session
                  </button>
                </div>
              ) : (
                <>
                  {/* Stats Summary - Moved before table */}
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow-lg p-6" style={{ border: '2px solid #42D7D7' }}>
                      <div className="text-sm text-gray-600">Total Sessions</div>
                      <div className="text-2xl font-bold mt-2" style={{ color: '#42D7D7' }}>
                        {sessions.length}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-lg p-6" style={{ border: '2px solid #42D7D7' }}>
                      <div className="text-sm text-gray-600">Active Sessions</div>
                      <div className="text-2xl font-bold mt-2" style={{ color: '#42D7D7' }}>
                        {sessions.filter(s => s.status.toLowerCase() === 'active').length}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-lg p-6" style={{ border: '2px solid #42D7D7' }}>
                      <div className="text-sm text-gray-600">Completed Sessions</div>
                      <div className="text-2xl font-bold mt-2" style={{ color: '#42D7D7' }}>
                        {sessions.filter(s => s.status.toLowerCase() === 'ended').length}
                      </div>
                    </div>
                  </div>

                  {/* Sessions Table */}
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ border: '2px solid #42D7D7' }}>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Session ID
                            </th>
                            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Patient
                            </th>
                            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Started
                            </th>
                            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ended
                            </th>
                            <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Duration
                            </th>
                            <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sessions.map((session) => {
                            const startTime = session.started_at ? new Date(session.started_at) : null;
                            const endTime = session.ended_at ? new Date(session.ended_at) : null;
                            const duration = startTime && endTime 
                              ? Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60)
                              : null;

                            return (
                              <tr key={session.id} className="hover:bg-gray-50">
                                <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                  #{session.id}
                                </td>
                                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                                  <div>
                                    {session.patient_name ? (
                                      <>
                                        <div className="font-medium">{session.patient_name}</div>
                                        {session.hospital_patient_id && (
                                          <div className="text-gray-500 text-xs">Hospital ID: {session.hospital_patient_id}</div>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-gray-400">No patient info</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-2 whitespace-nowrap">
                                  <span className={getStatusBadge(session.status)}>
                                    {session.status}
                                  </span>
                                </td>
                                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(session.started_at)}
                                </td>
                                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(session.ended_at)}
                                </td>
                                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {duration !== null ? `${duration} min` : '-'}
                                </td>
                                <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => handleViewSession(session.id)}
                                    className="text-[#42D7D7] hover:text-[#3BC5C5] transition-colors"
                                  >
                                    View →
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
