interface SOAPViewerProps {
  soapNote: any;
}

export default function SOAPViewer({ soapNote }: SOAPViewerProps) {
  const handleDownload = () => {
    const blob = new Blob([soapNote.html_content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soap-note-${soapNote.soap_note_id || Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">SOAP Note</h3>
        <div className="space-x-2">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Download HTML
          </button>
        </div>
      </div>
      <div className="border border-gray-300 rounded-md p-6 bg-white">
        <div
          dangerouslySetInnerHTML={{ __html: soapNote.html_content }}
          className="prose max-w-none"
        />
      </div>
      {soapNote.billing_codes && (
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Billing Codes</h4>
          <div className="grid grid-cols-2 gap-4">
            {soapNote.billing_codes.icd10 && soapNote.billing_codes.icd10.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">ICD-10 Codes</h5>
                <ul className="list-disc list-inside space-y-1">
                  {soapNote.billing_codes.icd10.map((code: any, idx: number) => (
                    <li key={idx} className="text-sm">
                      {code.code}: {code.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {soapNote.billing_codes.cpt && soapNote.billing_codes.cpt.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">CPT Codes</h5>
                <ul className="list-disc list-inside space-y-1">
                  {soapNote.billing_codes.cpt.map((code: any, idx: number) => (
                    <li key={idx} className="text-sm">
                      {code.code}: {code.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

