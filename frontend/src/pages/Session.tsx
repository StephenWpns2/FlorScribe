import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { WebSocketClient } from '../services/websocket';
import { AudioRecorder } from '../services/audio';
import TranscriptionView from '../components/TranscriptionView';
import ClinicalView from '../components/ClinicalView';
import SOAPViewer from '../components/SOAPViewer';
import EHRExport from '../components/EHRExport';
import type { TranscriptSegment, TranscriptUpdatePayload } from '../types/transcript';
import { useSpeakerAllocator } from '../hooks/useSpeakerAllocator';
import { createSegment, rebuildSegmentsFromText, transcriptToSegment } from '../utils/transcriptSegments';
import patientsService from '../services/patients';
import type { Patient } from '../types/patient';

interface User {
  email: string;
}

export default function Session() {
  const [user, setUser] = useState<User | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  
  // Session State
  const [sessionId, setSessionId] = useState<number | undefined>(
    searchParams.get('id') ? parseInt(searchParams.get('id')!) : undefined
  );
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [showPatientDetail, setShowPatientDetail] = useState(false);
  const [isExistingSession, setIsExistingSession] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interimSegment, setInterimSegment] = useState<TranscriptSegment | null>(null);
  const [clinicalData, setClinicalData] = useState<Record<string, unknown> | null>(null);
  const [soapNote, setSoapNote] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = useState<'transcription' | 'clinical' | 'soap' | 'export'>('transcription');
  const [isExtractingClinical, setIsExtractingClinical] = useState(false);
  const [isGeneratingSOAP, setIsGeneratingSOAP] = useState(false);
  
  const navigate = useNavigate();
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const { assignSpeaker, resetSpeakers } = useSpeakerAllocator();

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const WS_URL = API_BASE_URL.replace('http', 'ws') + '/api/realtime/ws';

  // Auth Check
  useEffect(() => {
    const fetchUser = async () => {
      const isDemoMode = localStorage.getItem('demo_mode') === 'true';
      if (isDemoMode) {
        setUser({ email: 'demo@florence.ai' });
        return;
      }

      try {
        const response = await api.get('/api/auth/me');
        setUser(response.data);
      } catch {
        navigate('/auth');
      }
    };
    fetchUser();
  }, [navigate]);

  // Fetch patients
  useEffect(() => {
    const fetchPatients = async () => {
      const isDemoMode = localStorage.getItem('demo_mode') === 'true';
      if (isDemoMode) {
        // Skip fetching in demo mode
        return;
      }

      setLoadingPatients(true);
      try {
        const response = await patientsService.getPatients(0, 100);
        setPatients(response.patients || []);
        
        // If patient_id is in URL params, try to find and select that patient
        const urlPatientId = searchParams.get('patient_id');
        if (urlPatientId) {
          const patient = response.patients.find(
            (p) => p.patientId === urlPatientId || p.id.toString() === urlPatientId
          );
          if (patient) {
            setSelectedPatient(patient);
          }
        }
      } catch (err) {
        console.error('Failed to fetch patients:', err);
        setError('Failed to load patients');
      } finally {
        setLoadingPatients(false);
      }
    };
    fetchPatients();
  }, [searchParams]);

  // Load existing session and patient info when sessionId is present
  useEffect(() => {
    const loadExistingSession = async () => {
      if (!sessionId) {
        setIsExistingSession(false);
        return;
      }
      
      const isDemoMode = localStorage.getItem('demo_mode') === 'true';
      if (isDemoMode) {
        setIsExistingSession(false);
        return;
      }

      setIsExistingSession(true);

      try {
        // Fetch session details to get patient info
        interface SessionResponse {
          sessions: Array<{
            id: number;
            patient_id?: string | null;
            patient_entity_id?: number | null;
            patient_name?: string | null;
          }>;
        }
        const sessionResponse = await api.get<SessionResponse>(`/api/admin/sessions`, {
          params: { limit: 1000 }
        });
        const sessions = sessionResponse.data.sessions || [];
        const currentSession = sessions.find((s) => s.id === sessionId);
        
        if (currentSession && (currentSession.patient_id || currentSession.patient_entity_id)) {
          // Try to fetch patient by patient_entity_id or patient_id
          try {
            // First try to get patient by patient_entity_id if available
            if (currentSession.patient_entity_id) {
              const patientResponse = await patientsService.getPatient(currentSession.patient_entity_id);
              setSelectedPatient(patientResponse);
            } else if (currentSession.patient_id) {
              // Otherwise, search for patient by patient_id
              const patientsResponse = await patientsService.getPatients(0, 100);
              const patient = patientsResponse.patients.find(
                (p) => p.patientId === currentSession.patient_id || p.id.toString() === currentSession.patient_id
              );
              if (patient) {
                setSelectedPatient(patient);
              }
            }
          } catch (err) {
            console.error('Failed to fetch patient:', err);
          }
        }

        // Load transcripts
        const transcriptsResponse = await api.get<{ transcripts: Array<{ id: number; text: string; speaker: string | null; isInterim: boolean; createdAt: string }> }>(`/api/transcripts/session/${sessionId}`);
        const transcripts = transcriptsResponse.data.transcripts || [];
        
        // Filter out interim transcripts and convert to segments
        const finalTranscripts = transcripts.filter((t) => !t.isInterim);
        if (finalTranscripts.length > 0) {
          const loadedSegments = finalTranscripts.map((transcript) =>
            transcriptToSegment(transcript, assignSpeaker)
          );
          setSegments(loadedSegments);
        }
      } catch (error) {
        console.debug('Could not load existing session:', error);
        setIsExistingSession(false);
      }
    };

    loadExistingSession();
  }, [sessionId, assignSpeaker]);

  const handleLogout = () => {
    stopRecording();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('demo_mode');
    navigate('/auth');
  };

  const handleBackToDashboard = () => {
    stopRecording();
    navigate('/dashboard');
  };

  // Derived State
  const transcriptText = useMemo(
    () => segments.map((segment) => segment.text).join(' ').trim(),
    [segments]
  );
  const editableTranscript = useMemo(
    () => segments.map((segment) => segment.text).join('\n\n'),
    [segments]
  );

  // Handlers
  const handleTranscriptUpdate = ({ text, isInterim, speaker }: TranscriptUpdatePayload) => {
    if (!text?.trim()) return;
    
    // Pass isFinal flag (opposite of isInterim) to help with speaker alternation
    const speakerLabel = assignSpeaker(speaker, !isInterim);
    if (isInterim) {
      setInterimSegment({
        ...createSegment(text, speakerLabel),
        id: 'interim',
      });
    } else {
      setSegments((prev) => [...prev, createSegment(text, speakerLabel)]);
      setInterimSegment(null);
    }
  };

  const startRecording = async () => {
    try {
      // Validate patient selection
      if (!selectedPatient) {
        setError('Please select a patient before starting the session');
        return;
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      // Build query parameters object
      const queryParams: Record<string, string> = {};
      if (sessionId) queryParams.session_id = sessionId.toString();
      if (selectedPatient.patientId) {
        queryParams.patient_id = selectedPatient.patientId;
      } else {
        queryParams.patient_id = selectedPatient.id.toString();
      }
      queryParams.patient_name = `${selectedPatient.firstName} ${selectedPatient.lastName}`;
      queryParams.patient_entity_id = selectedPatient.id.toString();
      
      // Create WebSocket client with base URL, token, and query params
      // The client will construct: ws://localhost:8000/api/realtime/ws?token=...&patient_id=...&patient_name=...
      wsClientRef.current = new WebSocketClient(WS_URL, token, queryParams);

      wsClientRef.current.connect(
        (data) => {
          if (data.type === 'session_started') {
            const sessionData = data as {
              type: string;
              session_id: number;
              user_id?: number;
              token_verified?: boolean;
              assemblyai_session_id?: string;
            };
            console.log('Session started:', {
              session_id: sessionData.session_id,
              user_id: sessionData.user_id,
              token_verified: sessionData.token_verified,
              assemblyai_session_id: sessionData.assemblyai_session_id,
            });
            setSessionId(sessionData.session_id);
          } else if (data.type === 'interim_transcript') {
            const transcriptData = data as {
              type: string;
              text: string;
              speaker?: string;
            };
            handleTranscriptUpdate({
              text: transcriptData.text,
              isInterim: true,
              speaker: transcriptData.speaker,
            });
          } else if (data.type === 'final_transcript') {
            const transcriptData = data as {
              type: string;
              text: string;
              speaker?: string;
            };
            handleTranscriptUpdate({
              text: transcriptData.text,
              isInterim: false,
              speaker: transcriptData.speaker,
            });
          } else if (data.type === 'error') {
            const errorData = data as {
              type: string;
              message?: string;
            };
            setError(errorData.message || 'An error occurred');
            setIsRecording(false);
            stopRecording();
          }
        },
        (error) => {
          console.error('WebSocket error:', error);
          setError('Connection error. Please check your backend server.');
          setIsRecording(false);
        },
        () => {
          setIsRecording(false);
        }
      );

      audioRecorderRef.current = new AudioRecorder();
      await audioRecorderRef.current.startRecording((audioData) => {
        if (wsClientRef.current) {
          wsClientRef.current.send(audioData);
        }
      });

      setIsRecording(true);
      setError('');
      setActiveTab('transcription');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    let audioBlob: Blob | null = null;
    
    if (audioRecorderRef.current) {
      audioBlob = await audioRecorderRef.current.stopRecording();
      audioRecorderRef.current = null;
    }
    if (wsClientRef.current) {
      wsClientRef.current.close();
      wsClientRef.current = null;
    }
    setIsRecording(false);

    // Upload audio for post-processing with speaker diarization
    if (audioBlob && sessionId) {
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, `session-${sessionId}.webm`);
        formData.append('session_id', sessionId.toString());

        // Upload audio file (don't wait for processing to complete)
        await api.post('/api/sessions/upload-audio', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        console.log('Audio uploaded for post-processing with speaker diarization');
      } catch (error) {
        console.error('Failed to upload audio for post-processing:', error);
        // Don't show error to user - this is a background enhancement
      }
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup: stop recording synchronously (don't await async operations in cleanup)
      // Note: This cleanup won't upload audio - that's handled by the explicit stopRecording call
      if (audioRecorderRef.current) {
        // Just stop the recorder without waiting for blob or upload
        audioRecorderRef.current.stopRecording().catch(console.error);
        audioRecorderRef.current = null;
      }
      if (wsClientRef.current) {
        wsClientRef.current.close();
        wsClientRef.current = null;
      }
      setIsRecording(false);
    };
  }, []);

  const handleTranscriptEdit = (updatedText: string) => {
    setSegments((prev) => rebuildSegmentsFromText(updatedText, prev));
    setInterimSegment(null);
  };

  const handleClinicalize = async () => {
    if (!transcriptText) return;
    setIsExtractingClinical(true);
    setError('');
    try {
      // Only send session_id if we don't have transcript_text
      // This prevents 404 errors when transcripts haven't been saved to DB yet
      const requestBody: { transcript_text: string; session_id?: number } = {
        transcript_text: transcriptText,
      };
      
      // Only include session_id if we have one, but prioritize transcript_text
      // The backend will use transcript_text if provided, so session_id is just for reference
      if (sessionId) {
        requestBody.session_id = sessionId;
      }
      
      const response = await api.post('/api/clinicalize', requestBody);
      setClinicalData(response.data);
      setActiveTab('clinical');
    } catch (error) {
      console.error('Error clinicalizing:', error);
      setError('Failed to extract clinical data');
    } finally {
      setIsExtractingClinical(false);
    }
  };

  const handleCompose = async () => {
    if (!clinicalData) return;
    setIsGeneratingSOAP(true);
    setError('');
    try {
      const response = await api.post('/api/compose', {
        clinical_extraction: clinicalData,
        transcript_text: transcriptText,
      });
      setSoapNote(response.data);
      setActiveTab('soap');
    } catch (error) {
      console.error('Error composing SOAP note:', error);
      setError('Failed to generate SOAP note');
    } finally {
      setIsGeneratingSOAP(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0FDFF' }}>
      <nav className="bg-white shadow" style={{ borderBottom: '2px solid #42D7D7' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={handleBackToDashboard}
                className="mr-4 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                style={{ color: '#42D7D7', border: '1px solid #42D7D7' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#42D7D7';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#42D7D7';
                }}
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-bold" style={{ color: '#42D7D7' }}>
                Session {sessionId ? `#${sessionId}` : 'Recording'}
              </h1>
            </div>
            <div className="flex items-center">
              <span className="mr-4" style={{ color: '#42D7D7' }}>{user?.email}</span>
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
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Patient Info & Controls */}
          <div className="bg-white p-6 rounded-lg shadow-lg mb-6" style={{ border: '2px solid #42D7D7' }}>
            {isExistingSession && selectedPatient ? (
              // Show patient name and View More button for existing sessions
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-lg font-semibold text-gray-800">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </span>
                    {selectedPatient.patientId && (
                      <span className="ml-2 text-sm text-gray-500">
                        (ID: {selectedPatient.patientId})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowPatientDetail(true)}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors border"
                    style={{ borderColor: '#42D7D7', color: '#42D7D7' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#42D7D7';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#42D7D7';
                    }}
                  >
                    View More
                  </button>
                </div>
              </div>
            ) : (
              // Show dropdown for new sessions
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Patient <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPatient?.id || ''}
                  onChange={(e) => {
                    const patient = patients.find((p) => p.id === parseInt(e.target.value));
                    if (patient) {
                      setSelectedPatient(patient);
                      setError(''); // Clear any previous errors
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#42D7D7] focus:border-[#42D7D7]"
                  disabled={isRecording || loadingPatients}
                  required
                >
                  <option value="">-- Select a patient --</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName}
                      {patient.patientId ? ` (ID: ${patient.patientId})` : ` (ID: ${patient.id})`}
                    </option>
                  ))}
                </select>
                {loadingPatients && (
                  <p className="mt-1 text-sm text-gray-500">Loading patients...</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="px-8 py-3 rounded-lg text-white font-medium flex items-center transition-all transform hover:scale-105 shadow-lg"
                    style={{ backgroundColor: '#42D7D7' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3BC5C5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#42D7D7'}
                  >
                    <span className="w-3 h-3 bg-white rounded-full mr-2"></span>
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-8 py-3 rounded-lg text-white font-medium flex items-center transition-all transform hover:scale-105 shadow-lg"
                    style={{ backgroundColor: '#FF6B6B' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF5252'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF6B6B'}
                  >
                    <span className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></span>
                    Stop Recording
                  </button>
                )}
                {(segments.length > 0 || interimSegment) && (
                  <button
                    onClick={() => {
                      setSegments([]);
                      setInterimSegment(null);
                      resetSpeakers();
                      setClinicalData(null);
                      setSoapNote(null);
                      setSessionId(undefined);
                      setSelectedPatient(null);
                      setActiveTab('transcription');
                    }}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors border"
                    style={{ borderColor: '#42D7D7', color: '#42D7D7' }}
                  >
                    Clear Session
                  </button>
                )}
              </div>
              {error && (
                <div className="text-red-600 text-sm bg-red-50 px-3 py-1 rounded">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Patient Detail Modal */}
          {showPatientDetail && selectedPatient && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold" style={{ color: '#42D7D7' }}>
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h3>
                  <button
                    onClick={() => setShowPatientDetail(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600"><strong>Phone:</strong></p>
                    <p className="text-gray-800">{selectedPatient.phoneNumber}</p>
                  </div>
                  {selectedPatient.email && (
                    <div>
                      <p className="text-sm text-gray-600"><strong>Email:</strong></p>
                      <p className="text-gray-800">{selectedPatient.email}</p>
                    </div>
                  )}
                  {selectedPatient.dateOfBirth && (
                    <div>
                      <p className="text-sm text-gray-600"><strong>Date of Birth:</strong></p>
                      <p className="text-gray-800">{new Date(selectedPatient.dateOfBirth).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedPatient.gender && (
                    <div>
                      <p className="text-sm text-gray-600"><strong>Gender:</strong></p>
                      <p className="text-gray-800">{selectedPatient.gender}</p>
                    </div>
                  )}
                  {selectedPatient.patientId && (
                    <div>
                      <p className="text-sm text-gray-600"><strong>Patient ID:</strong></p>
                      <p className="text-gray-800">{selectedPatient.patientId}</p>
                    </div>
                  )}
                  {selectedPatient.nationalId && (
                    <div>
                      <p className="text-sm text-gray-600"><strong>National ID:</strong></p>
                      <p className="text-gray-800">{selectedPatient.nationalId}</p>
                    </div>
                  )}
                </div>

                {selectedPatient.address && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600"><strong>Address:</strong></p>
                    <p className="text-gray-800">{selectedPatient.address}</p>
                  </div>
                )}

                {selectedPatient.allergies && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600"><strong>Allergies:</strong></p>
                    <p className="text-gray-800">{selectedPatient.allergies}</p>
                  </div>
                )}

                {selectedPatient.currentMedications && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600"><strong>Current Medications:</strong></p>
                    <p className="text-gray-800">{selectedPatient.currentMedications}</p>
                  </div>
                )}

                {selectedPatient.pastMedicalHistory && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600"><strong>Past Medical History:</strong></p>
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedPatient.pastMedicalHistory}</p>
                  </div>
                )}

                {selectedPatient.familyMedicalHistory && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600"><strong>Family Medical History:</strong></p>
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedPatient.familyMedicalHistory}</p>
                  </div>
                )}

                {selectedPatient.pastSurgeries && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600"><strong>Past Surgeries:</strong></p>
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedPatient.pastSurgeries}</p>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowPatientDetail(false)}
                    className="px-6 py-2 rounded-md text-white font-medium"
                    style={{ backgroundColor: '#42D7D7' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3BC5C5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#42D7D7'}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Workspace */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ border: '2px solid #42D7D7' }}>
            <div className="border-b border-gray-200 bg-gray-50">
              <nav className="flex">
                {(['transcription', 'clinical', 'soap', 'export'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-[#42D7D7] text-[#00838F]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6 min-h-[500px]">
              {activeTab === 'transcription' && (
                <TranscriptionView
                  segments={segments}
                  interimSegment={interimSegment}
                  editableText={editableTranscript}
                  onTranscriptEdit={handleTranscriptEdit}
                  onClinicalize={handleClinicalize}
                  isExtractingClinical={isExtractingClinical}
                />
              )}
              {activeTab === 'clinical' && (
                clinicalData ? (
                  <ClinicalView
                    data={clinicalData}
                    onCompose={handleCompose}
                    isGeneratingSOAP={isGeneratingSOAP}
                  />
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    {segments.length > 0 
                      ? "Click 'Extract Clinical Data' in the Transcription tab to proceed."
                      : "Record a session to extract clinical data."}
                  </div>
                )
              )}
              {activeTab === 'soap' && (
                soapNote ? (
                  <SOAPViewer soapNote={soapNote} />
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    Generate a SOAP note from the Clinical Data tab first.
                  </div>
                )
              )}
              {activeTab === 'export' && (
                soapNote && typeof soapNote.soap_note_id === 'number' ? (
                  <EHRExport soapNoteId={soapNote.soap_note_id} />
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    Generate a SOAP note to enable export options.
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

