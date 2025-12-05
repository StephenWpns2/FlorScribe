import { useState } from 'react';

interface SOAPViewerProps {
  soapNote: any;
}

export default function SOAPViewer({ soapNote }: SOAPViewerProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadHTML = () => {
    const blob = new Blob([soapNote.html_content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soap-note-${soapNote.soap_note_id || Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    setIsGeneratingPDF(true);
    
    // Create a new window with the SOAP note content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setIsGeneratingPDF(false);
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SOAP Note - ${soapNote.soap_note_id || 'Document'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${soapNote.html_content}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load, then trigger print dialog
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      setIsGeneratingPDF(false);
      // Close the window after a short delay
      setTimeout(() => {
        printWindow.close();
      }, 500);
    }, 250);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">SOAP Note</h3>
        <div className="space-x-2">
          <button
            onClick={handleDownloadHTML}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Download HTML
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isGeneratingPDF && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
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

