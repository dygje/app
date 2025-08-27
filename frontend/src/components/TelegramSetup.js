import { useState, useEffect } from 'react';
import axios from 'axios';

const TelegramSetup = ({ onAuthSuccess }) => {
  const [step, setStep] = useState('config'); // config, phone-code, 2fa
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notification, setNotification] = useState({ type: '', message: '', show: false });
  const [notificationStartTime, setNotificationStartTime] = useState(Date.now());
  
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

  // Auto-dismiss notifications with smart timing
  useEffect(() => {
    if (notification.show) {
      // Success messages auto-dismiss after 3 seconds
      // Error messages auto-dismiss after 8 seconds (giving user time to read and act)
      // Info messages auto-dismiss after 5 seconds
      const delay = notification.type === 'success' ? 3000 : 
                   notification.type === 'error' ? 8000 : 5000;
      
      const timer = setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [notification.show, notification.type]);

  // Clear notifications when step changes
  useEffect(() => {
    setError('');
    setSuccess('');
    setNotification({ type: '', message: '', show: false });
  }, [step]);

  const showNotification = (type, message) => {
    setNotificationStartTime(Date.now());
    setNotification({ type, message, show: true });
    // Clear old state
    setError('');
    setSuccess('');
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
    
    // Enhanced validation with more specific feedback
    if (!phoneCode) {
      showNotification('error', 'Please enter the verification code sent to your phone.');
      return;
    }
    
    if (phoneCode.length < 5) {
      showNotification('error', 'Verification code must be at least 5 digits long.');
      return;
    }
    
    if (!/^\d+$/.test(phoneCode)) {
      showNotification('error', 'Verification code should only contain numbers.');
      return;
    }

    setLoading(true);
    setNotification({ type: '', message: '', show: false });

    try {
      const response = await axios.post('/telegram/verify-code', {
        phone_code: phoneCode
      });

      if (response.data.requires_2fa) {
        showNotification('info', '2FA password required. Please enter your password.');
        setTimeout(() => {
          setStep('2fa');
        }, 1500);
      } else {
        showNotification('success', 'Authentication successful! Redirecting...');
        setTimeout(() => {
          onAuthSuccess();
        }, 2000);
      }
    } catch (err) {
      console.error('Verify code error:', err);
      let errorMsg = 'Failed to verify code. Please try again.';
      
      if (err.response?.data?.detail) {
        // Use the specific error message from backend
        errorMsg = err.response.data.detail;
      } else if (err.response?.status === 429) {
        errorMsg = 'Too many attempts. Please wait a moment before trying again.';
      } else if (err.response?.status === 500) {
        errorMsg = 'Server error occurred. Please try again later.';
      }
      
      showNotification('error', errorMsg);
      setLoading(false);
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
    setLoading(true);
    setNotification({ type: '', message: '', show: false });

    try {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 relative">
          {/* Header with Telegram Logo */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{getStepTitle()}</h1>
            <p className="text-gray-600 text-sm">{getStepDescription()}</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === 'config' ? 'bg-blue-500 text-white' : 
                (step === 'phone-code' || step === '2fa') ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {(step === 'phone-code' || step === '2fa') ? '✓' : '1'}
              </div>
              <div className={`w-12 h-1 transition-colors ${
                step === 'phone-code' || step === '2fa' ? 'bg-green-500' : 'bg-gray-200'
              }`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === 'phone-code' ? 'bg-blue-500 text-white' : 
                step === '2fa' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step === '2fa' ? '✓' : '2'}
              </div>
              <div className={`w-12 h-1 transition-colors ${step === '2fa' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === '2fa' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Enhanced Notification System - Fixed positioning and improved UX */}
          {notification.show && (
            <div className={`mb-6 p-4 rounded-xl border-l-4 shadow-sm transition-all duration-300 transform ${
              notification.type === 'error' ? 'bg-red-50 border-l-red-400 border-red-200' :
              notification.type === 'success' ? 'bg-green-50 border-l-green-400 border-green-200' :
              notification.type === 'info' ? 'bg-blue-50 border-l-blue-400 border-blue-200' :
              'bg-gray-50 border-l-gray-400 border-gray-200'
            } ${notification.show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                  notification.type === 'error' ? 'bg-red-500' :
                  notification.type === 'success' ? 'bg-green-500' :
                  notification.type === 'info' ? 'bg-blue-500' : 'bg-gray-500'
                }`}>
                  {notification.type === 'error' ? '!' :
                   notification.type === 'success' ? '✓' :
                   notification.type === 'info' ? 'i' : '?'}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold ${
                    notification.type === 'error' ? 'text-red-800' :
                    notification.type === 'success' ? 'text-green-800' :
                    notification.type === 'info' ? 'text-blue-800' : 'text-gray-800'
                  }`}>
                    {notification.type === 'error' ? 'Authentication Error' :
                     notification.type === 'success' ? 'Success' :
                     notification.type === 'info' ? 'Information' : 'Notice'}
                  </div>
                  <p className={`text-sm mt-1 ${
                    notification.type === 'error' ? 'text-red-700' :
                    notification.type === 'success' ? 'text-green-700' :
                    notification.type === 'info' ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {notification.message}
                  </p>
                  
                  {/* Enhanced action buttons for error cases */}
                  {notification.type === 'error' && step === 'phone-code' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {notification.message.includes('expired') && (
                        <button
                          onClick={handleRequestNewCode}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? (
                            <>
                              <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                              Sending...
                            </>
                          ) : (
                            'Request New Code'
                          )}
                        </button>
                      )}
                      {notification.message.includes('incorrect') && (
                        <button
                          onClick={() => {
                            setPhoneCode('');
                            setNotification({ ...notification, show: false });
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          Clear & Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => setNotification({ ...notification, show: false })}
                  className={`flex-shrink-0 p-1 rounded-md transition-colors ${
                    notification.type === 'error' ? 'text-red-400 hover:text-red-600 hover:bg-red-100' :
                    notification.type === 'success' ? 'text-green-400 hover:text-green-600 hover:bg-green-100' :
                    notification.type === 'info' ? 'text-blue-400 hover:text-blue-600 hover:bg-blue-100' :
                    'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Configuration */}
          {step === 'config' && (
            <form onSubmit={handleConfigSubmit} className="space-y-4">
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
                {loading ? 'Sending Code...' : 'Continue'}
              </button>
            </form>
          )}

          {/* Step 2: Phone Code Verification */}
          {step === 'phone-code' && (
            <form onSubmit={handlePhoneCodeSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">
                  Code sent to <span className="font-medium">{config.phone_number}</span>
                </p>
              </div>

              <div>
                <label className="form-label">Verification Code</label>
                <input
                  type="text"
                  value={phoneCode}
                  onChange={(e) => {
                    const numericCode = e.target.value.replace(/\D/g, '');
                    setPhoneCode(numericCode);
                    console.log('Phone code updated:', numericCode, 'Length:', numericCode.length);
                  }}
                  className={`form-input text-center text-lg tracking-widest ${
                    phoneCode.length >= 5 ? 'border-green-300 bg-green-50' : ''
                  }`}
                  placeholder="12345"
                  maxLength="6"
                  required
                />
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-500">
                      Check your Telegram app
                    </p>
                    {phoneCode && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        phoneCode.length >= 5 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {phoneCode.length}/5+
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestNewCode}
                    disabled={loading}
                    className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn btn-outline flex-1"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !phoneCode || phoneCode.length < 5}
                  className={`btn btn-primary flex-1 ${loading ? 'loading' : ''} ${
                    (!phoneCode || phoneCode.length < 5) && !loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading && <div className="spinner"></div>}
                  {loading ? 'Verifying...' : 
                   (!phoneCode || phoneCode.length < 5) ? `Enter Code (${phoneCode ? phoneCode.length : 0}/5)` : 'Verify'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Two-Factor Authentication */}
          {step === '2fa' && (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div className="text-center mb-4">
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

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn btn-outline flex-1"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !twoFAPassword.trim()}
                  className={`btn btn-primary flex-1 ${loading ? 'loading' : ''}`}
                >
                  {loading && <div className="spinner"></div>}
                  {loading ? 'Authenticating...' : 'Complete'}
                </button>
              </div>
            </form>
          )}

          {/* Help Section */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h4>
              <div className="space-y-1 text-xs text-gray-600">
                {step === 'config' && (
                  <>
                    <p>1. Visit <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">my.telegram.org</a> to get API credentials</p>
                    <p>2. Use your actual Telegram phone number</p>
                  </>
                )}
                {step === 'phone-code' && (
                  <>
                    <p>1. Check your Telegram app for the code</p>
                    <p>2. Code expires after 5 minutes</p>
                    <p>3. Use "Resend code" if needed</p>
                  </>
                )}
                {step === '2fa' && (
                  <>
                    <p>1. Enter the password you set for 2FA</p>
                    <p>2. This is different from your phone code</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramSetup;