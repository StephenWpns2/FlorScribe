import { useState } from 'react';

interface ClinicalViewProps {
  data: any;
  onCompose: () => void;
  isGeneratingSOAP?: boolean;
}

export default function ClinicalView({ data, onCompose, isGeneratingSOAP = false }: ClinicalViewProps) {
  const [editableData, setEditableData] = useState(data);

  const updateField = (section: string, index: number, field: string, value: any) => {
    const newData = { ...editableData };
    newData[section][index][field] = value;
    setEditableData(newData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b-2" style={{ borderColor: '#42D7D7' }}>
        <div>
          <h3 className="text-2xl font-bold" style={{ color: '#42D7D7' }}>Clinical Extraction</h3>
          <p className="text-sm text-gray-600 mt-1">Review and edit extracted clinical data</p>
        </div>
        <button
          onClick={onCompose}
          disabled={isGeneratingSOAP}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg transition-all transform hover:scale-105"
        >
          {isGeneratingSOAP && (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isGeneratingSOAP ? 'Generating...' : 'Generate SOAP Note'}
        </button>
      </div>

      {/* Clinical Data Sections */}
      <div className="space-y-6">
        {editableData.problems && editableData.problems.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border-2" style={{ borderColor: '#42D7D7' }}>
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#42D7D7' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Problems/Diagnoses
            </h4>
            <div className="space-y-3">
              {editableData.problems.map((problem: any, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-[#42D7D7] transition-colors">
                  <input
                    type="text"
                    value={problem.description || ''}
                    onChange={(e) => updateField('problems', idx, 'description', e.target.value)}
                    className="w-full mb-3 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#42D7D7] text-gray-900 font-medium"
                    placeholder="Problem description"
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-700">ICD-10:</span>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-medium">
                      {problem.icd10_code || 'Not assigned'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {editableData.medications && editableData.medications.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border-2" style={{ borderColor: '#42D7D7' }}>
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#42D7D7' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Medications
            </h4>
            <div className="space-y-3">
              {editableData.medications.map((med: any, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-[#42D7D7] transition-colors">
                  <input
                    type="text"
                    value={med.name || ''}
                    onChange={(e) => updateField('medications', idx, 'name', e.target.value)}
                    className="w-full mb-3 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#42D7D7] text-gray-900 font-medium"
                    placeholder="Medication name"
                  />
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {med.dosage && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                        Dosage: {med.dosage}
                      </span>
                    )}
                    {med.frequency && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                        Frequency: {med.frequency}
                      </span>
                    )}
                    {med.route && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
                        Route: {med.route}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {editableData.orders && editableData.orders.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border-2" style={{ borderColor: '#42D7D7' }}>
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#42D7D7' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Orders
            </h4>
            <div className="space-y-3">
              {editableData.orders.map((order: any, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-[#42D7D7] transition-colors">
                  <div className="mb-3">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold">
                      {order.type}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={order.description || ''}
                    onChange={(e) => updateField('orders', idx, 'description', e.target.value)}
                    className="w-full mb-3 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#42D7D7] text-gray-900"
                    placeholder="Order description"
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-700">CPT:</span>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-medium">
                      {order.cpt_code || 'Not assigned'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {editableData.vitals && editableData.vitals.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border-2" style={{ borderColor: '#42D7D7' }}>
            <h4 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#42D7D7' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Vital Signs
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {editableData.vitals.map((vital: any, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-[#42D7D7] transition-colors">
                  <div className="font-semibold text-gray-700 mb-2">{vital.type}</div>
                  <input
                    type="text"
                    value={vital.value || ''}
                    onChange={(e) => updateField('vitals', idx, 'value', e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#42D7D7] text-gray-900"
                    placeholder="Value"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

