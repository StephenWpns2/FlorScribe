import { useState, useRef } from 'react';
import type { ImportResponse } from '../services/patients';

interface FileUploadProps {
  onUpload: (file: File) => Promise<ImportResponse>;
  acceptedTypes?: string;
}

export default function FileUpload({ onUpload, acceptedTypes = '.csv,.xlsx,.xls' }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const response = await onUpload(file);
      setResult(response);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            style={{ borderColor: '#42D7D7' }}
          >
            <svg
              className="mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Choose File
          </label>
          <p className="mt-2 text-sm text-gray-500">
            {acceptedTypes.includes('csv') && 'CSV or Excel files'}
            {!acceptedTypes.includes('csv') && `Accepted: ${acceptedTypes}`}
          </p>
        </div>

        {file && (
          <div className="mt-4 flex items-center justify-between bg-gray-50 p-3 rounded">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-gray-400 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">{file.name}</span>
              <span className="ml-2 text-xs text-gray-500">
                ({(file.size / 1024).toFixed(2)} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {file && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="w-full px-4 py-2 rounded-md text-white font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#42D7D7' }}
          onMouseEnter={(e) => !uploading && (e.currentTarget.style.backgroundColor = '#3BC5C5')}
          onMouseLeave={(e) => !uploading && (e.currentTarget.style.backgroundColor = '#42D7D7')}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          <div className="font-medium mb-2">Import completed!</div>
          <div className="text-sm space-y-1">
            <div>Created: {result.created} patients</div>
            <div>Updated: {result.updated} patients</div>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2">
                <div className="font-medium">Errors:</div>
                <ul className="list-disc list-inside text-xs">
                  {result.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
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

