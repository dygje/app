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
          title: 'API Configuration',
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
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Material Design Authentication Card */}
        <div className="material-card-elevated rounded-xl overflow-hidden material-scale-in">
          
          {/* Material Design Header */}
          <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-8 py-10 text-center relative">
            <div className="absolute inset-0 bg-primary-600 opacity-90"></div>
            <div className="relative z-10">
              {/* Material Design Icon Container */}
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-elevation-4 backdrop-blur-sm">
                <span className="material-icons text-white text-2xl">{stepInfo.icon}</span>
              </div>
              
              <h1 className="text-title-large text-white font-medium mb-2">
                {stepInfo.title}
              </h1>
              <p className="text-body-medium text-primary-100 opacity-90">
                {stepInfo.subtitle}
              </p>
            </div>
          </div>

          {/* Material Design Progress Indicator */}
          <div className="px-8 py-6 bg-surface-50 border-b border-surface-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-label-small text-surface-700 font-medium">
                STEP {stepInfo.stepNumber} OF 3
              </span>
              <span className="text-label-small text-surface-500 font-medium">
                {stepInfo.progress}%
              </span>
            </div>
            
            <div className="material-progress-linear">
              <div 
                className="material-progress-bar"
                style={{ width: `${stepInfo.progress}%` }}
              />
            </div>
          </div>

          {/* Material Design Content */}
          <div className="px-8 py-8">
            {/* Material Design Notification */}
            {notification.show && (
              <div className={`material-card-outlined mb-6 p-4 rounded-lg border-l-4 material-slide-up ${
                notification.type === 'error' 
                  ? 'bg-error-50 border-error-500' 
                  : notification.type === 'success' 
                  ? 'bg-success-50 border-success-500'
                  : 'bg-primary-50 border-primary-500'
              }`}>
                <div className="flex items-start space-x-3">
                  <span className={`material-icons text-lg ${
                    notification.type === 'error' 
                      ? 'text-error-600' 
                      : notification.type === 'success' 
                      ? 'text-success-600'
                      : 'text-primary-600'
                  }`}>
                    {notification.type === 'error' 
                      ? 'error' 
                      : notification.type === 'success' 
                      ? 'check_circle'
                      : 'info'}
                  </span>
                  <p className={`text-body-medium font-medium ${
                    notification.type === 'error' 
                      ? 'text-error-800' 
                      : notification.type === 'success' 
                      ? 'text-success-800'
                      : 'text-primary-800'
                  }`}>
                    {notification.message}
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: API Configuration */}
            {step === 'config' && (
              <form onSubmit={handleConfigSubmit} className="space-y-6">
                <div className="space-y-6">
                  {/* Material Design Text Fields */}
                  <div className="material-textfield">
                    <input
                      type="text"
                      value={config.api_id}
                      onChange={(e) => setConfig({...config, api_id: e.target.value})}
                      className="material-textfield-input peer"
                      placeholder=" "
                      required
                    />
                    <label className="material-textfield-label">
                      API ID
                    </label>
                  </div>

                  <div className="material-textfield">
                    <input
                      type="text"
                      value={config.api_hash}
                      onChange={(e) => setConfig({...config, api_hash: e.target.value})}
                      className="material-textfield-input peer"
                      placeholder=" "
                      required
                    />
                    <label className="material-textfield-label">
                      API Hash
                    </label>
                  </div>

                  <div className="material-textfield">
                    <input
                      type="tel"
                      value={config.phone_number}
                      onChange={(e) => setConfig({...config, phone_number: e.target.value})}
                      className="material-textfield-input peer"
                      placeholder=" "
                      required
                    />
                    <label className="material-textfield-label">
                      Phone Number (with country code)
                    </label>
                  </div>
                </div>

                {/* Material Design Help Card */}
                <div className="material-card-outlined bg-primary-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <span className="material-icons text-primary-600 text-lg mt-0.5">help</span>
                    <div>
                      <h4 className="text-title-small font-medium text-primary-800 mb-1">
                        Need API Credentials?
                      </h4>
                      <p className="text-body-small text-primary-700 mb-2">
                        Get your API ID and Hash from my.telegram.org
                      </p>
                      <a 
                        href="https://my.telegram.org" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-body-small text-primary-600 font-medium hover:underline"
                      >
                        Visit Telegram API
                      </a>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !config.api_id || !config.api_hash || !config.phone_number}
                  className={`material-button-filled w-full ${loading ? 'material-loading' : ''}`}
                >
                  {loading && <div className="material-spinner mr-3" />}
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
                  <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-icons text-secondary-700 text-2xl">sms</span>
                  </div>
                  <p className="text-body-medium text-surface-600 mb-6">
                    We sent a verification code to your phone number
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="material-textfield">
                    <input
                      type="text"
                      value={phoneCode}
                      onChange={(e) => {
                        const numericCode = e.target.value.replace(/\D/g, '');
                        setPhoneCode(numericCode);
                      }}
                      className="material-textfield-input peer text-center text-xl font-mono tracking-widest"
                      placeholder=" "
                      maxLength="6"
                      autoFocus
                      required
                    />
                    <label className="material-textfield-label">
                      Verification Code
                    </label>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-body-small text-surface-500">
                      Enter 5-digit code
                    </span>
                    <button
                      type="button"
                      onClick={handleRequestNewCode}
                      disabled={loading}
                      className="material-button-text text-primary-600 font-medium"
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
                    className={`material-button-filled w-full ${loading ? 'material-loading' : ''}`}
                  >
                    {loading && <div className="material-spinner mr-3" />}
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
                    className="material-button-outlined w-full"
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
                  <div className="w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-icons text-warning-700 text-2xl">security</span>
                  </div>
                  <p className="text-body-medium text-surface-600 mb-6">
                    Your account has two-factor authentication enabled
                  </p>
                </div>

                <div className="material-textfield">
                  <input
                    type="password"
                    value={twoFAPassword}
                    onChange={(e) => setTwoFAPassword(e.target.value)}
                    className="material-textfield-input peer"
                    placeholder=" "
                    autoFocus
                    required
                  />
                  <label className="material-textfield-label">
                    2FA Password
                  </label>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={loading || !twoFAPassword.trim()}
                    className={`material-button-filled w-full ${loading ? 'material-loading' : ''}`}
                  >
                    {loading && <div className="material-spinner mr-3" />}
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
                    className="material-button-outlined w-full"
                  >
                    <span className="material-icons mr-2">arrow_back</span>
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Material Design Footer */}
          <div className="px-8 py-6 bg-surface-50 border-t border-surface-200 text-center">
            <p className="text-body-small text-surface-500">
              Secured by Material Design • Telegram API
            </p>
          </div>
        </div>

        {/* Material Design Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-body-small text-surface-500 mb-2">
            <span className="material-icons text-xs mr-1 align-middle">shield</span>
            Your credentials are encrypted and secure
          </p>
        </div>
      </div>
    </div>
  );
};

export default TelegramSetup;