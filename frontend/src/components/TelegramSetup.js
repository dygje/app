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
      
      // Send authentication code
      setTimeout(async () => {
        try {
          await axios.post('/telegram/send-code');
          showNotification('success', 'Verification code sent to your phone');
          setTimeout(() => setStep('phone-code'), 1000);
        } catch (err) {
          console.error('Send code error:', err);
          const errorMsg = err.response?.data?.detail || 'Failed to send verification code';
          showNotification('error', errorMsg);
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary-50 to-gray-100">
      <div className="w-full max-w-md">
        {/* Main Setup Card */}
        <div className="card fade-in shadow-large">
          
          {/* Header */}
          <div className="card-header text-center">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="material-icons text-white text-2xl">{stepInfo.icon}</span>
            </div>
            
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              {stepInfo.title}
            </h1>
            <p className="text-gray-600">
              {stepInfo.subtitle}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-600">
                STEP {stepInfo.stepNumber} OF 3
              </span>
              <span className="text-xs text-gray-500">
                {stepInfo.progress}%
              </span>
            </div>
            
            <div className="w-full bg-gray-300 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${stepInfo.progress}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="admin-card-content">
            {/* Notification */}
            {notification.show && (
              <div className={`p-4 rounded-lg mb-6 border-l-4 ${
                notification.type === 'error' 
                  ? 'bg-red-900 border-red-600' 
                  : notification.type === 'success' 
                  ? 'bg-green-900 border-green-600'
                  : 'bg-blue-900 border-blue-600'
              }`}>
                <div className="flex items-center space-x-3">
                  <span className={`material-icons ${
                    notification.type === 'error' 
                      ? 'text-red-400' 
                      : notification.type === 'success' 
                      ? 'text-green-400'
                      : 'text-blue-400'
                  }`}>
                    {notification.type === 'error' 
                      ? 'error' 
                      : notification.type === 'success' 
                      ? 'check_circle'
                      : 'info'}
                  </span>
                  <p className={`text-sm font-medium ${
                    notification.type === 'error' 
                      ? 'text-red-200' 
                      : notification.type === 'success' 
                      ? 'text-green-200'
                      : 'text-blue-200'
                  }`}>
                    {notification.message}
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: API Configuration */}
            {step === 'config' && (
              <form onSubmit={handleConfigSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="form-group">
                    <label className="form-label">API ID</label>
                    <input
                      type="text"
                      value={config.api_id}
                      onChange={(e) => setConfig({...config, api_id: e.target.value})}
                      className="form-input"
                      placeholder="Enter your API ID"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">API Hash</label>
                    <input
                      type="text"
                      value={config.api_hash}
                      onChange={(e) => setConfig({...config, api_hash: e.target.value})}
                      className="form-input"
                      placeholder="Enter your API Hash"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      value={config.phone_number}
                      onChange={(e) => setConfig({...config, phone_number: e.target.value})}
                      className="form-input"
                      placeholder="+1234567890"
                      required
                    />
                  </div>
                </div>

                {/* Help Card */}
                <div className="admin-card bg-blue-900 border-blue-700">
                  <div className="p-4">
                    <div className="flex items-start space-x-3">
                      <span className="material-icons text-blue-400 text-lg mt-0.5">help</span>
                      <div>
                        <h4 className="text-sm font-semibold text-blue-200 mb-1">
                          Need API Credentials?
                        </h4>
                        <p className="text-sm text-blue-300 mb-2">
                          Get your API ID and Hash from my.telegram.org
                        </p>
                        <a 
                          href="https://my.telegram.org" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300 underline"
                        >
                          Visit Telegram API
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !config.api_id || !config.api_hash || !config.phone_number}
                  className="btn-primary w-full"
                >
                  {loading && <div className="loading-spinner mr-3" />}
                  <span className="material-icons mr-2">
                    {loading ? 'hourglass_empty' : 'arrow_forward'}
                  </span>
                  {loading ? 'Configuring...' : 'Continue'}
                </button>
              </form>
            )}

            {/* Step 2: Phone Code Verification */}
            {step === 'phone-code' && (
              <form onSubmit={handlePhoneCodeSubmit} className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="material-icons text-white text-2xl">sms</span>
                  </div>
                  <p className="text-gray-300 mb-6">
                    We sent a verification code to your phone number
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="form-group">
                    <label className="form-label">Verification Code</label>
                    <input
                      type="text"
                      value={phoneCode}
                      onChange={(e) => {
                        const numericCode = e.target.value.replace(/\D/g, '');
                        setPhoneCode(numericCode);
                      }}
                      className="form-input text-center text-xl tracking-widest font-mono"
                      placeholder="12345"
                      maxLength="6"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                      Enter 5-digit code
                    </span>
                    <button
                      type="button"
                      onClick={handleRequestNewCode}
                      disabled={loading}
                      className="btn-ghost text-sm"
                    >
                      <span className="material-icons mr-1 text-sm">refresh</span>
                      Resend Code
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={loading || phoneCode.length < 5}
                    className="btn-primary w-full"
                  >
                    {loading && <div className="loading-spinner mr-3" />}
                    <span className="material-icons mr-2">verified</span>
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      resetState();
                      setStep('config');
                      setPhoneCode('');
                    }}
                    className="btn-secondary w-full"
                  >
                    <span className="material-icons mr-2">arrow_back</span>
                    Back
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Two-Factor Authentication */}
            {step === '2fa' && (
              <form onSubmit={handle2FASubmit} className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="material-icons text-white text-2xl">security</span>
                  </div>
                  <p className="text-gray-300 mb-6">
                    Your account has two-factor authentication enabled
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">2FA Password</label>
                  <input
                    type="password"
                    value={twoFAPassword}
                    onChange={(e) => setTwoFAPassword(e.target.value)}
                    className="form-input"
                    placeholder="Enter your 2FA password"
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={loading || !twoFAPassword.trim()}
                    className="btn-primary w-full"
                  >
                    {loading && <div className="loading-spinner mr-3" />}
                    <span className="material-icons mr-2">lock_open</span>
                    {loading ? 'Authenticating...' : 'Complete Authentication'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      resetState();
                      setStep('phone-code');
                      setTwoFAPassword('');
                    }}
                    className="btn-secondary w-full"
                  >
                    <span className="material-icons mr-2">arrow_back</span>
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-800 border-t border-gray-700 text-center">
            <p className="text-xs text-gray-400">
              <span className="material-icons text-xs mr-1 align-middle">security</span>
              Your credentials are encrypted and secure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramSetup;