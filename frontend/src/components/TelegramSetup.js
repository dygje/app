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
      
      // Send authentication code immediately without delay
      try {
        await axios.post('/telegram/send-code');
        showNotification('success', 'Verification code sent to your phone');
        // Move to next step immediately
        setStep('phone-code');
      } catch (err) {
        console.error('Send code error:', err);
        const errorMsg = err.response?.data?.detail || 'Failed to send verification code';
        showNotification('error', errorMsg);
      }
      
    } catch (err) {
      console.error('Config error:', err);
      let errorMsg = 'Failed to save configuration';
      if (err.message.includes('country code')) {
        errorMsg = err.message;
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      showNotification('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneCodeSubmit = async (e) => {
    e.preventDefault();
    
    if (!phoneCode || phoneCode.length < 5) {
      showNotification('error', 'Please enter a valid 5-digit verification code');
      return;
    }

    if (loading) return;

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
        
        // Check if it's an expired code error
        if (errorMsg.toLowerCase().includes('expired')) {
          showNotification('error', errorMsg);
          // Auto-clear the code input for expired codes
          setPhoneCode('');
          // Optionally auto-request new code after showing error
          setTimeout(() => {
            showNotification('info', 'You can click "Resend Code" to get a new verification code');
          }, 3000);
          return;
        }
      }
      
      showNotification('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    
    if (!twoFAPassword.trim()) {
      showNotification('error', 'Please enter your 2FA password');
      return;
    }

    if (loading) return;

    setLoading(true);
    setNotification({ type: '', message: '', show: false });

    try {
      await axios.post('/telegram/verify-2fa', {
        password: twoFAPassword
      });
      
      showNotification('success', 'Authentication successful!');
      setTimeout(() => onAuthSuccess(), 1500);
    } catch (err) {
      console.error('2FA error:', err);
      let errorMsg = 'Invalid 2FA password';
      
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      
      showNotification('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewCode = async () => {
    if (loading) return;
    
    setLoading(true);
    setNotification({ type: '', message: '', show: false });
    
    try {
      await axios.post('/telegram/send-code');
      showNotification('success', 'New verification code sent');
      setPhoneCode('');
    } catch (err) {
      console.error('Resend code error:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to send new verification code';
      showNotification('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getStepInfo = () => {
    switch (step) {
      case 'config':
        return {
          title: 'Telegram API Setup',
          subtitle: 'Enter your Telegram API credentials',
          icon: 'api',
          stepNumber: 1,
          progress: 33
        };
      case 'phone-code':
        return {
          title: 'Phone Verification',
          subtitle: 'Enter the code sent to your phone',
          icon: 'phone_android',
          stepNumber: 2,
          progress: 67
        };
      case '2fa':
        return {
          title: 'Two-Factor Authentication',
          subtitle: 'Enter your 2FA password',
          icon: 'security',
          stepNumber: 3,
          progress: 100
        };
      default:
        return {
          title: 'Setup',
          subtitle: '',
          icon: 'settings',
          stepNumber: 1,
          progress: 0
        };
    }
  };

  const stepInfo = getStepInfo();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Telegram Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.820 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </div>
          <h1 className="text-xl font-medium text-gray-800 mb-1">{stepInfo.title}</h1>
          <p className="text-sm text-gray-500">{stepInfo.subtitle}</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Progress Bar */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Step {stepInfo.stepNumber} of 3
              </span>
              <span className="text-xs text-gray-400">
                {stepInfo.progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${stepInfo.progress}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Notification */}
            {notification.show && (
              <div className={`flex items-center p-3 mb-4 rounded-md text-sm ${
                notification.type === 'error' 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : notification.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                <div className={`w-4 h-4 mr-2 ${
                  notification.type === 'error' 
                    ? 'text-red-500' 
                    : notification.type === 'success' 
                    ? 'text-green-500'
                    : 'text-blue-500'
                }`}>
                  <span className="material-icons text-sm">
                    {notification.type === 'error' && 'error'}
                    {notification.type === 'success' && 'check_circle'}
                    {notification.type === 'info' && 'info'}
                  </span>
                </div>
                {notification.message}
              </div>
            )}

            {/* Step 1: API Configuration */}
            {step === 'config' && (
              <form onSubmit={handleConfigSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API ID</label>
                    <input
                      type="text"
                      value={config.api_id}
                      onChange={(e) => setConfig({...config, api_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter your API ID"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Hash</label>
                    <input
                      type="text"
                      value={config.api_hash}
                      onChange={(e) => setConfig({...config, api_hash: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter your API Hash"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={config.phone_number}
                      onChange={(e) => setConfig({...config, phone_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="+1234567890"
                      required
                    />
                  </div>
                </div>

                {/* Help Section */}
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-4">
                  <div className="flex items-start">
                    <span className="material-icons text-blue-500 mr-2 text-lg">vpn_key</span>
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Need API Credentials?
                      </p>
                      <p className="text-xs text-gray-600 mb-2">
                        Get your API ID and Hash from my.telegram.org
                      </p>
                      <a 
                        href="https://my.telegram.org" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 underline font-medium"
                      >
                        Visit my.telegram.org →
                      </a>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !config.api_id || !config.api_hash || !config.phone_number}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Configuring...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Phone Code Verification */}
            {step === 'phone-code' && (
              <form onSubmit={handlePhoneCodeSubmit} className="space-y-4">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                    <span className="material-icons text-green-500">smartphone</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    We sent a verification code to your phone number
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={phoneCode}
                    onChange={(e) => {
                      const numericCode = e.target.value.replace(/\D/g, '');
                      setPhoneCode(numericCode);
                    }}
                    className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest font-mono"
                    placeholder="97231"
                    maxLength="6"
                    autoFocus
                    required
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      Enter 5-digit code
                    </span>
                    <button
                      type="button"
                      onClick={handleRequestNewCode}
                      disabled={loading}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
                    >
                      <span className="material-icons text-sm mr-1">refresh</span>
                      Resend Code
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading || phoneCode.length < 5}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <span className="material-icons text-sm mr-2">verified</span>
                        Verify Code
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Two-Factor Authentication */}
            {step === '2fa' && (
              <form onSubmit={handle2FASubmit} className="space-y-4">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-3">
                    <span className="material-icons text-yellow-500">security</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Your account has two-factor authentication enabled
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">2FA Password</label>
                  <input
                    type="password"
                    value={twoFAPassword}
                    onChange={(e) => setTwoFAPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Enter your 2FA password"
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-2 pt-4">
                  <button
                    type="submit"
                    disabled={loading || !twoFAPassword.trim()}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <span className="material-icons text-sm mr-2">lock</span>
                        Complete Authentication
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      resetState();
                      setStep('phone-code');
                      setTwoFAPassword('');
                    }}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                  >
                    <span className="material-icons text-sm mr-2">arrow_back</span>
                    Back to Verification
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
            <div className="flex items-center justify-center text-xs text-gray-500">
              <span className="material-icons text-sm mr-1">lock</span>
              Your credentials are encrypted and secure
            </div>
          </div>
        </div>

        {/* Made with Emergent */}
        <div className="text-center mt-6">
          <div className="flex items-center justify-center text-xs text-gray-400">
            <span className="material-icons text-sm mr-1">flash_on</span>
            Made with Emergent
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramSetup;