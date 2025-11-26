import { useState } from 'react';
import api from '../services/api';

interface EHRExportProps {
  soapNoteId: number;
}

export default function EHRExport({ soapNoteId }: EHRExportProps) {
  const [ehrProvider, setEhrProvider] = useState('epic');
  const [patientId, setPatientId] = useState('');
  const [practitionerId, setPractitionerId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post('/api/export', {
        soap_note_id: soapNoteId,
        ehr_provider: ehrProvider,
        patient_id: patientId,
        practitioner_id: practitionerId,
        client_id: clientId,
        client_secret: clientSecret,
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">EHR Export</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            EHR Provider
          </label>
          <select
            value={ehrProvider}
            onChange={(e) => setEhrProvider(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="epic">Epic</option>
            <option value="cerner">Cerner</option>
            <option value="office_ally">Office Ally</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Patient ID
          </label>
          <input
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter patient ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Practitioner ID
          </label>
          <input
            type="text"
            value={practitionerId}
            onChange={(e) => setPractitionerId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter practitioner ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client ID (OAuth)
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter OAuth client ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Secret (OAuth)
          </label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter OAuth client secret"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {result && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-800">
              Export {result.status}: {result.export_log_id}
            </div>
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={loading || !patientId || !practitionerId}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Exporting...' : 'Export to EHR'}
        </button>
      </div>
    </div>
  );
}

