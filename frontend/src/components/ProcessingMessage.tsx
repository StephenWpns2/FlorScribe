interface ProcessingMessageProps {
  message: string;
  isProcessing: boolean;
}

export default function ProcessingMessage({ message, isProcessing }: ProcessingMessageProps) {
  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border-2" style={{ borderColor: '#42D7D7' }}>
        <div className="flex flex-col items-center">
          <svg
            className="animate-spin h-12 w-12 mb-4"
            style={{ color: '#42D7D7' }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <h3 className="text-xl font-semibold mb-2" style={{ color: '#42D7D7' }}>
            Processing...
          </h3>
          <p className="text-gray-600 text-center">{message}</p>
        </div>
      </div>
    </div>
  );
}


