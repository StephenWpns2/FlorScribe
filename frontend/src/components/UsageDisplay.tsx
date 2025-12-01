import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import subscriptionsService, { UsageData } from '../services/subscriptions';

export default function UsageDisplay() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const data = await subscriptionsService.getUsage();
        setUsageData(data);
      } catch (err: any) {
        // Don't show error if user doesn't have subscription
        if (err.response?.status !== 404) {
          setError('Failed to load usage data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6" style={{ border: '2px solid #42D7D7' }}>
        <div className="text-gray-500">Loading usage...</div>
      </div>
    );
  }

  if (!usageData || !usageData.subscription) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6" style={{ border: '2px solid #42D7D7' }}>
        <div className="text-center">
          <h3 className="text-lg font-bold mb-2" style={{ color: '#42D7D7' }}>
            No Active Subscription
          </h3>
          <p className="text-gray-600 mb-4">Subscribe to a plan to start using Flor Scribe</p>
          <button
            onClick={() => navigate('/pricing')}
            className="px-6 py-2 rounded-md text-white font-medium"
            style={{ backgroundColor: '#42D7D7' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3BC5C5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#42D7D7'}
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  const { subscription, audioHoursUsed, audioHoursLimit, notesCreated, notesLimit } = usageData;

  const audioPercentage = audioHoursLimit
    ? Math.min((audioHoursUsed / audioHoursLimit) * 100, 100)
    : 0;
  const notesPercentage = notesLimit
    ? Math.min((notesCreated / notesLimit) * 100, 100)
    : 0;

  const audioWarning = audioHoursLimit && audioPercentage >= 80;
  const audioExceeded = audioHoursLimit && audioPercentage >= 100;
  const notesWarning = notesLimit && notesPercentage >= 80;
  const notesExceeded = notesLimit && notesPercentage >= 100;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6" style={{ border: '2px solid #42D7D7' }}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold" style={{ color: '#42D7D7' }}>
            {subscription.plan.name}
          </h3>
          <p className="text-sm text-gray-600">
            Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={() => navigate('/pricing')}
          className="px-4 py-2 rounded-md text-sm font-medium border-2"
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
          Upgrade
        </button>
      </div>

      {/* Audio Hours Usage */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Audio Hours</span>
          <span className={`text-sm font-medium ${
            audioExceeded ? 'text-red-600' : audioWarning ? 'text-yellow-600' : 'text-gray-600'
          }`}>
            {audioHoursUsed.toFixed(2)} / {audioHoursLimit ? `${audioHoursLimit}` : 'Unlimited'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${
              audioExceeded
                ? 'bg-red-500'
                : audioWarning
                ? 'bg-yellow-500'
                : 'bg-[#42D7D7]'
            }`}
            style={{ width: `${audioPercentage}%` }}
          />
        </div>
        {audioWarning && (
          <p className="text-xs mt-1 text-yellow-600">
            {audioExceeded
              ? 'Limit exceeded. Please upgrade to continue.'
              : 'Approaching limit. Consider upgrading.'}
          </p>
        )}
      </div>

      {/* Notes Usage */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Notes Created</span>
          <span className={`text-sm font-medium ${
            notesExceeded ? 'text-red-600' : notesWarning ? 'text-yellow-600' : 'text-gray-600'
          }`}>
            {notesCreated} / {notesLimit ? `${notesLimit}` : 'Unlimited'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${
              notesExceeded
                ? 'bg-red-500'
                : notesWarning
                ? 'bg-yellow-500'
                : 'bg-[#42D7D7]'
            }`}
            style={{ width: `${notesPercentage}%` }}
          />
        </div>
        {notesWarning && (
          <p className="text-xs mt-1 text-yellow-600">
            {notesExceeded
              ? 'Limit exceeded. Please upgrade to continue.'
              : 'Approaching limit. Consider upgrading.'}
          </p>
        )}
      </div>
    </div>
  );
}

