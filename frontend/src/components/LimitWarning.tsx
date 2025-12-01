import { useNavigate } from 'react-router-dom';

interface LimitWarningProps {
  type: 'audio' | 'notes';
  currentUsage: number;
  limit: number;
  onClose: () => void;
}

export default function LimitWarning({ type, currentUsage, limit, onClose }: LimitWarningProps) {
  const navigate = useNavigate();
  const exceeded = currentUsage >= limit;
  const percentage = (currentUsage / limit) * 100;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border-2" style={{ borderColor: exceeded ? '#EF4444' : '#F59E0B' }}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-2xl font-bold ${exceeded ? 'text-red-600' : 'text-yellow-600'}`}>
            {exceeded ? 'Limit Exceeded' : 'Approaching Limit'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            {exceeded
              ? `You have exceeded your ${type === 'audio' ? 'audio hours' : 'notes'} limit. Please upgrade your plan to continue using Flor Scribe.`
              : `You have used ${currentUsage.toFixed(type === 'audio' ? 2 : 0)} of ${limit} ${type === 'audio' ? 'hours' : 'notes'} (${percentage.toFixed(0)}%). Consider upgrading your plan.`}
          </p>

          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full ${exceeded ? 'bg-red-500' : 'bg-yellow-500'}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-md font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {exceeded ? 'I Understand' : 'Later'}
          </button>
          <button
            onClick={() => {
              navigate('/pricing');
              onClose();
            }}
            className="flex-1 px-4 py-2 rounded-md text-white font-medium transition-colors"
            style={{ backgroundColor: '#42D7D7' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3BC5C5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#42D7D7'}
          >
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}

