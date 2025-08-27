import { useState } from 'react';
import axios from 'axios';

const TelegramSetup = ({ onAuthSuccess }) => {
  const [step, setStep] = useState('config'); // config, phone-code, 2fa
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Configuration step
  const [config, setConfig] = useState({
    api_id: '',
    api_hash: '',
    phone_number: ''
  });
  
  // Phone code step
  const [phoneCode, setPhoneCode] = useState('');
  
  // 2FA step
  const [twoFAPassword, setTwoFAPassword] = useState('');

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Save configuration
      await axios.post('/telegram/config', config);
      setSuccess('Configuration saved successfully');
      
      // Send authentication code
      setTimeout(async () => {
        try {
          await axios.post('/telegram/send-code');
          setSuccess('Verification code sent to your phone number');
          setStep('phone-code');
        } catch (err) {
          setError(err.response?.data?.detail || 'Failed to send verification code');
        }
        setLoading(false);
      }, 1000);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save configuration');
      setLoading(false);
    }
  };

  const handlePhoneCodeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/telegram/verify-code', {
        phone_code: phoneCode
      });

      if (response.data.requires_2fa) {
        setSuccess('2FA password required');
        setStep('2fa');
      } else {
        setSuccess('Authentication successful!');
        setTimeout(() => {
          onAuthSuccess();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post('/telegram/verify-2fa', {
        password: twoFAPassword
      });
      
      setSuccess('Authentication successful!');
      setTimeout(() => {
        onAuthSuccess();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid 2FA password');
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    setSuccess('');
    if (step === '2fa') {
      setStep('phone-code');
    } else if (step === 'phone-code') {
      setStep('config');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header with Telegram Logo */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect to Telegram</h1>
            <p className="text-gray-600">Set up your automation account</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === 'config' ? 'bg-blue-500 text-white' : 
                (step === 'phone-code' || step === '2fa') ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${
                step === 'phone-code' || step === '2fa' ? 'bg-green-500' : 'bg-gray-200'
              }`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === 'phone-code' ? 'bg-blue-500 text-white' : 
                step === '2fa' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <div className={`w-16 h-1 ${step === '2fa' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === '2fa' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <span className="text-red-500 mr-2">⚠️</span>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex">
                <span className="text-green-500 mr-2">✅</span>
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Step 1: Configuration */}
          {step === 'config' && (
            <form onSubmit={handleConfigSubmit} className="space-y-6">
              <div>
                <label className="form-label">API ID</label>
                <input
                  type="text"
                  value={config.api_id}
                  onChange={(e) => setConfig({...config, api_id: e.target.value})}
                  className="form-input"
                  placeholder="123456"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get from <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">my.telegram.org</a>
                </p>
              </div>

              <div>
                <label className="form-label">API Hash</label>
                <input
                  type="text"
                  value={config.api_hash}
                  onChange={(e) => setConfig({...config, api_hash: e.target.value})}
                  className="form-input"
                  placeholder="abcdef123456789..."
                  required
                />
              </div>

              <div>
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  value={config.phone_number}
                  onChange={(e) => setConfig({...config, phone_number: e.target.value})}
                  className="form-input"
                  placeholder="+1234567890"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code (e.g., +1 for US, +62 for Indonesia)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full btn btn-primary py-3 ${loading ? 'loading' : ''}`}
              >
                {loading && <div className="spinner"></div>}
                {loading ? 'Saving Configuration...' : 'Continue'}
              </button>
            </form>
          )}

          {/* Step 2: Phone Code Verification */}
          {step === 'phone-code' && (
            <form onSubmit={handlePhoneCodeSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter Verification Code</h3>
                <p className="text-sm text-gray-600">
                  We sent a code to {config.phone_number}
                </p>
              </div>

              <div>
                <label className="form-label">Verification Code</label>
                <input
                  type="text"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                  className="form-input text-center text-lg tracking-widest"
                  placeholder="12345"
                  maxLength="5"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Check your Telegram app for the verification code
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn btn-outline flex-1"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`btn btn-primary flex-1 ${loading ? 'loading' : ''}`}
                >
                  {loading && <div className="spinner"></div>}
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Two-Factor Authentication */}
          {step === '2fa' && (
            <form onSubmit={handle2FASubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter 2FA Password</h3>
                <p className="text-sm text-gray-600">
                  Your account has two-factor authentication enabled
                </p>
              </div>

              <div>
                <label className="form-label">2FA Password</label>
                <input
                  type="password"
                  value={twoFAPassword}
                  onChange={(e) => setTwoFAPassword(e.target.value)}
                  className="form-input"
                  placeholder="Enter your 2FA password"
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn btn-outline flex-1"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`btn btn-primary flex-1 ${loading ? 'loading' : ''}`}
                >
                  {loading && <div className="spinner"></div>}
                  {loading ? 'Authenticating...' : 'Complete'}
                </button>
              </div>
            </form>
          )}

          {/* Help Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h4>
              <div className="space-y-1">
                <p className="text-xs text-gray-600">
                  1. Create API credentials at <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">my.telegram.org</a>
                </p>
                <p className="text-xs text-gray-600">
                  2. Use the same phone number as your Telegram account
                </p>
                <p className="text-xs text-gray-600">
                  3. Check your Telegram app for the verification code
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramSetup;