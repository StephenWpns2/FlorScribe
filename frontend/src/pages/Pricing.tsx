import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import subscriptionsService from '../services/subscriptions';
import type { SubscriptionPlan, UserSubscription } from '../services/subscriptions';

export default function Pricing() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansData, subscriptionData] = await Promise.all([
          subscriptionsService.getPlans(),
          subscriptionsService.getCurrentSubscription().catch(() => null),
        ]);
        setPlans(plansData);
        setCurrentSubscription(subscriptionData);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load pricing plans');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      // Reload subscription data
      subscriptionsService.getCurrentSubscription()
        .then(setCurrentSubscription)
        .catch(() => {});
    }
    
    if (canceled === 'true') {
      setError('Checkout was canceled');
    }
  }, [searchParams]);

  const handleSelectPlan = async (planType: 'LITE' | 'PRO' | 'ENTERPRISE') => {
    setProcessingPlan(planType);
    setError('');

    try {
      const { url } = await subscriptionsService.createCheckoutSession(planType);
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create checkout session');
      setProcessingPlan(null);
    }
  };

  const getPlanFeatures = (plan: SubscriptionPlan) => {
    const features = [];
    
    if (plan.audioHoursLimit === null) {
      features.push('Unlimited audio → text');
    } else {
      features.push(`${plan.audioHoursLimit} hours audio → text`);
    }
    
    if (plan.notesLimit === null) {
      features.push('Unlimited notes');
    } else {
      features.push(`${plan.notesLimit} notes`);
    }
    
    if (plan.features?.multiUser) {
      features.push('Multi-user support');
    }
    
    if (plan.features?.ehrIntegration) {
      features.push('EHR integration');
    }
    
    return features;
  };

  const isCurrentPlan = (planType: string) => {
    return currentSubscription?.plan?.planType === planType;
  };

  const canUpgrade = (planType: string) => {
    if (!currentSubscription?.plan) return true;
    
    const planHierarchy = { LITE: 1, PRO: 2, ENTERPRISE: 3 };
    const currentLevel = planHierarchy[currentSubscription.plan.planType as keyof typeof planHierarchy] || 0;
    const targetLevel = planHierarchy[planType as keyof typeof planHierarchy] || 0;
    
    return targetLevel > currentLevel;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0FDFF' }}>
        <div className="text-gray-600">Loading pricing plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0FDFF' }}>
      <nav className="bg-white shadow" style={{ borderBottom: '2px solid #42D7D7' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold" style={{ color: '#42D7D7' }}>
                Flor Scribe
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 rounded-md text-white font-medium transition-colors"
                style={{ backgroundColor: '#42D7D7' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3BC5C5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#42D7D7'}
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
          <p className="text-xl text-gray-600">Select the plan that best fits your needs</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded max-w-2xl mx-auto">
            {error}
          </div>
        )}

        {currentSubscription?.plan && (
          <div className="mb-8 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded max-w-2xl mx-auto text-center">
            Current Plan: <strong>{currentSubscription.plan.name}</strong>
            {currentSubscription.status === 'ACTIVE' && (
              <span className="ml-2 text-sm">(Active until {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()})</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const features = getPlanFeatures(plan);
            const isCurrent = isCurrentPlan(plan.planType);
            const canUpgradeTo = canUpgrade(plan.planType);

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-lg p-8 border-2 ${
                  isCurrent ? 'border-[#42D7D7]' : 'border-gray-200'
                }`}
              >
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold" style={{ color: '#42D7D7' }}>
                      ${plan.price}
                    </span>
                    <span className="text-gray-600">/mo</span>
                  </div>
                  {isCurrent && (
                    <span className="inline-block px-3 py-1 bg-[#42D7D7] text-white text-sm rounded-full">
                      Current Plan
                    </span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-[#42D7D7] mr-2 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.planType)}
                  disabled={isCurrent || processingPlan === plan.planType || !canUpgradeTo}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all ${
                    isCurrent
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : processingPlan === plan.planType
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : canUpgradeTo
                      ? 'text-white'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  style={
                    !isCurrent && canUpgradeTo && processingPlan !== plan.planType
                      ? { backgroundColor: '#42D7D7' }
                      : {}
                  }
                  onMouseEnter={(e) => {
                    if (!isCurrent && canUpgradeTo && processingPlan !== plan.planType) {
                      e.currentTarget.style.backgroundColor = '#3BC5C5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent && canUpgradeTo && processingPlan !== plan.planType) {
                      e.currentTarget.style.backgroundColor = '#42D7D7';
                    }
                  }}
                >
                  {processingPlan === plan.planType
                    ? 'Processing...'
                    : isCurrent
                    ? 'Current Plan'
                    : canUpgradeTo
                    ? 'Select Plan'
                    : 'Downgrade'}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

