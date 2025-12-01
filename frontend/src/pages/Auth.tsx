import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Auth() {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });

      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/register', {
        email,
        password,
        name: fullName,
      });

      // After successful registration, switch to sign in tab
      setActiveTab('signin');
      setError('');
      setFullName('');
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Header with Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            {/* Heart Icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="#4DCBCB"
              />
            </svg>
            <h1 className="text-2xl font-semibold text-gray-800">Florence AI</h1>
            {/* Sparkle Icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z"
                fill="#9CA3AF"
              />
            </svg>
          </div>
        </div>
        <p className="text-center text-sm text-gray-500 mb-8">Your compassionate companion</p>

        {/* Auth Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Tabs */}
          <div className="flex gap-1 mb-6">
            <button
              onClick={() => {
                setActiveTab('signin');
                setError('');
              }}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-t-md transition-colors ${
                activeTab === 'signin'
                  ? 'bg-white text-gray-900 border-b-2 border-florence'
                  : 'text-gray-500 hover:text-gray-700 bg-gray-50'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('signup');
                setError('');
              }}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-t-md transition-colors ${
                activeTab === 'signup'
                  ? 'bg-white text-gray-900 border-b-2 border-florence'
                  : 'text-gray-500 hover:text-gray-700 bg-gray-50'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form Content */}
          {activeTab === 'signin' ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
              <p className="text-sm text-gray-600 mb-6">Sign in to your account to continue</p>

              <form onSubmit={handleSignIn} className="space-y-5">
                {error && (
                  <div className="rounded-md bg-red-50 p-3">
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-florence focus:border-transparent sm:text-sm"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-florence focus:border-transparent sm:text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-florence hover:bg-[#3DB8B8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-florence disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              {/* <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('demo_mode', 'true');
                    navigate('/dashboard');
                  }}
                  className="w-full flex justify-center py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-florence transition-colors"
                >
                  DEMO
                </button>
              </div> */}
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create account</h2>
              <p className="text-sm text-gray-600 mb-6">Get started with Florence AI today</p>

              <form onSubmit={handleSignUp} className="space-y-5">
                {error && (
                  <div className="rounded-md bg-red-50 p-3">
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                )}

                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-florence focus:border-transparent sm:text-sm"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-florence focus:border-transparent sm:text-sm"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-florence focus:border-transparent sm:text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-florence hover:bg-[#3DB8B8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-florence disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating account...' : 'Sign Up'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

