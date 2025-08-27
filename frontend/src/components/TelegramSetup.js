import { useState, useEffect } from 'react';
import axios from 'axios';

const TelegramSetup = ({ onAuthSuccess }) => {
  const [step, setStep] = useState('config'); // config, phone-code, 2fa
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '', show: false });
  
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

  // Reset loading state on step change
  useEffect(() => {
    setLoading(false);
    setNotification({ type: '', message: '', show: false });
  }, [step]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification.show) {
      const delay = notification.type === 'success' ? 3000 : 
                   notification.type === 'error' ? 6000 : 4000;
      
      const timer = setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [notification.show, notification.type]);

  const showNotification = (type, message) => {
    setNotification({ type, message, show: true });
  };

  const resetState = () => {
    setLoading(false);
    setNotification({ type: '', message: '', show: false });
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotification({ type: '', message: '', show: false });

    try {
      // Validate phone number format
      if (!config.phone_number.startsWith('+')) {
        throw new Error('Phone number must include country code (e.g., +1234567890)');
      }

      // Save configuration
      await axios.post('/telegram/config', {
        api_id: parseInt(config.api_id),
        api_hash: config.api_hash,
        phone_number: config.phone_number
      });

      showNotification('success', 'Configuration saved. Sending verification code...');
      
      // Send authentication code after short delay
      setTimeout(async () => {
        try {
          await axios.post('/telegram/send-code');
          showNotification('success', 'Verification code sent to your phone number');
          setTimeout(() => {
            setStep('phone-code');
          }, 1500);
        } catch (err) {
          console.error('Send code error:', err);
          const errorMsg = err.response?.data?.detail || 'Failed to send verification code';
          showNotification('error', errorMsg);
          setLoading(false);
        }
      }, 1000);
      
    } catch (err) {
      console.error('Config error:', err);
      let errorMsg = 'Failed to save configuration';
      if (err.message.includes('country code')) {
        errorMsg = err.message;
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      showNotification('error', errorMsg);
      setLoading(false);
    }
  };

  const handlePhoneCodeSubmit = async (e) => {
    e.preventDefault();
    
    if (!phoneCode || phoneCode.length < 5) {
      showNotification('error', 'Please enter a valid 5-digit verification code');
      return;
    }

    if (loading) return; // Prevent double submission

    setLoading(true);
    setNotification({ type: '', message: '', show: false });

    try {
      const response = await axios.post('/telegram/verify-code', {
        phone_code: phoneCode
      });

      if (response.data.requires_2fa) {
        showNotification('info', '2FA password required');
        setStep('2fa');
      } else {
        showNotification('success', 'Authentication successful!');
        setTimeout(() => onAuthSuccess(), 1500);
      }
    } catch (err) {
      console.error('Verify code error:', err);
      let errorMsg = 'Failed to verify code. Please try again.';
      
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      
      showNotification('error', errorMsg);
    } finally {
      setLoading(false); // Always reset loading
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    
    if (!twoFAPassword.trim()) {
      showNotification('error', 'Please enter your 2FA password');
      return;
    }

    setLoading(true);
    setNotification({ type: '', message: '', show: false });

    try {
      await axios.post('/telegram/verify-2fa', {
        password: twoFAPassword
      });
      
      showNotification('success', 'Authentication successful! Redirecting...');
      setTimeout(() => {
        onAuthSuccess();
      }, 2000);
    } catch (err) {
      console.error('2FA error:', err);
      let errorMsg = 'Invalid 2FA password';
      
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (detail.includes('invalid')) {
          errorMsg = 'Invalid 2FA password. Please check and try again.';
        } else {
          errorMsg = detail;
        }
      }
      
      showNotification('error', errorMsg);
      setLoading(false);
    }
  };

  const handleBack = () => {
    setNotification({ type: '', message: '', show: false });
    if (step === '2fa') {
      setStep('phone-code');
      setTwoFAPassword('');
    } else if (step === 'phone-code') {
      setStep('config');
      setPhoneCode('');
    }
  };

  const handleRequestNewCode = async () => {
    // Reset loading state first
    setLoading(false);
    setNotification({ type: '', message: '', show: false });
    
    try {
      setLoading(true);
      await axios.post('/telegram/send-code');
      showNotification('success', 'New verification code sent to your phone number');
      setPhoneCode('');
    } catch (err) {
      console.error('Resend code error:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to send new verification code';
      showNotification('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'config': return 'API Configuration';
      case 'phone-code': return 'Phone Verification';
      case '2fa': return 'Two-Factor Authentication';
      default: return 'Setup';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'config': return 'Enter your Telegram API credentials';
      case 'phone-code': return 'Enter the code sent to your phone';
      case '2fa': return 'Enter your 2FA password';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">{getStepTitle()}</h1>
            <p className="text-sm text-gray-600">{getStepDescription()}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Step {step === 'config' ? '1' : step === 'phone-code' ? '2' : '3'} of 3</span>
              <span className="text-xs text-gray-500">
                {step === 'config' ? '33%' : step === 'phone-code' ? '67%' : '100%'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{
                  width: step === 'config' ? '33%' : step === 'phone-code' ? '67%' : '100%'
                }}
              ></div>
            </div>
          </div>

          {/* Notification */}
          {notification.show && (
            <div className={`mb-6 p-4 rounded-lg border-l-4 ${
              notification.type === 'error' ? 'bg-red-50 border-l-red-400' :
              notification.type === 'success' ? 'bg-green-50 border-l-green-400' :
              'bg-blue-50 border-l-blue-400'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    notification.type === 'error' ? 'text-red-800' :
                    notification.type === 'success' ? 'text-green-800' :
                    'text-blue-800'
                  }`}>
                    {notification.message}
                  </p>
                </div>
                <button
                  onClick={() => setNotification({ ...notification, show: false })}
                  className="text-gray-400 hover:text-gray-600 ml-3"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Configuration */}
          {step === 'config' && (
            <form onSubmit={handleConfigSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API ID</label>
                  <input
                    type="text"
                    value={config.api_id}
                    onChange={(e) => setConfig({...config, api_id: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="123456"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get from <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">my.telegram.org</a>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Hash</label>
                  <input
                    type="text"
                    value={config.api_hash}
                    onChange={(e) => setConfig({...config, api_hash: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="abcdef123456789..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={config.phone_number}
                    onChange={(e) => setConfig({...config, phone_number: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder="+1234567890"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Include country code (e.g., +1 for US, +62 for Indonesia)
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
                  loading
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending Code...</span>
                  </div>
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          )}

          {/* Step 2: Phone Code Verification */}
          {step === 'phone-code' && (
            <form onSubmit={handlePhoneCodeSubmit} className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">
                  Code sent to
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {config.phone_number}
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={phoneCode}
                  onChange={(e) => {
                    const numericCode = e.target.value.replace(/\D/g, '');
                    setPhoneCode(numericCode);
                  }}
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono border-2 border-gray-200 rounded-lg py-4 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="_ _ _ _ _"
                  maxLength="6"
                  autoFocus
                  required
                />
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-500">
                    Enter 5-digit code
                  </span>
                  <button
                    type="button"
                    onClick={handleRequestNewCode}
                    disabled={loading}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || phoneCode.length < 5}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
                    loading || phoneCode.length < 5
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    'Verify Code'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    resetState();
                    setStep('config');
                    setPhoneCode('');
                  }}
                  className="w-full py-3 px-4 rounded-lg font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Two-Factor Authentication */}
          {step === '2fa' && (
            <form onSubmit={handle2FASubmit} className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Your account has two-factor authentication enabled
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">2FA Password</label>
                <input
                  type="password"
                  value={twoFAPassword}
                  onChange={(e) => setTwoFAPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Enter your 2FA password"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || !twoFAPassword.trim()}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
                    loading || !twoFAPassword.trim()
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    'Complete Authentication'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    resetState();
                    setStep('phone-code');
                    setTwoFAPassword('');
                  }}
                  className="w-full py-3 px-4 rounded-lg font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramSetup;