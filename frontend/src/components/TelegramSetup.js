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
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md material-fade-in">
        {/* Telegram Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.820 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </div>
          <h1 className="text-headline-medium font-normal text-surface-900 mb-2">{stepInfo.title}</h1>
          <p className="text-body-medium text-surface-600">{stepInfo.subtitle}</p>
        </div>

        {/* Main Card */}
        <div className="material-card-elevated">
          {/* Progress Bar */}
          <div className="p-6 border-b border-surface-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-label-medium text-surface-500 uppercase tracking-wide">
                Step {stepInfo.stepNumber} of 3
              </span>
              <span className="text-body-small text-surface-400">
                {stepInfo.progress}%
              </span>
            </div>
            <div className="w-full bg-surface-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${stepInfo.progress}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Notification */}
            {notification.show && (
              <div className={`material-card-outlined p-4 mb-6 rounded-lg ${
                notification.type === 'error' 
                  ? 'bg-error-50 border-error-200' 
                  : notification.type === 'success' 
                  ? 'bg-success-50 border-success-200'
                  : 'bg-primary-50 border-primary-200'
              }`}>
                <div className="flex items-start space-x-3">
                  <span className={`material-icons text-lg ${
                    notification.type === 'error' 
                      ? 'text-error-600' 
                      : notification.type === 'success' 
                      ? 'text-success-600'
                      : 'text-primary-600'
                  }`}>
                    {notification.type === 'error' && 'error'}
                    {notification.type === 'success' && 'check_circle'}
                    {notification.type === 'info' && 'info'}
                  </span>
                  <p className={`text-body-medium ${
                    notification.type === 'error' 
                      ? 'text-error-700' 
                      : notification.type === 'success' 
                      ? 'text-success-700'
                      : 'text-primary-700'
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
                  <div className="material-textfield">
                    <input
                      type="text"
                      value={config.api_id}
                      onChange={(e) => setConfig({...config, api_id: e.target.value})}
                      className="material-textfield-input peer"
                      placeholder=" "
                      required
                    />
                    <label className="material-textfield-label">API ID</label>
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
                    <label className="material-textfield-label">API Hash</label>
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
                    <label className="material-textfield-label">Phone Number</label>
                  </div>
                </div>

                {/* Help Section */}
                <div className="material-card-outlined bg-primary-50 border-primary-200 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <span className="material-icons text-primary-600 text-lg">vpn_key</span>
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
                        className="text-body-small text-primary-600 hover:text-primary-700 underline font-medium"
                      >
                        Visit my.telegram.org →
                      </a>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !config.api_id || !config.api_hash || !config.phone_number}
                  className={`material-button-filled w-full ${loading ? 'material-loading' : ''}`}
                >
                  {loading && <div className="material-spinner mr-2" />}
                  <span className="material-icons mr-2 text-sm">arrow_forward</span>
                  Continue
                </button>
              </form>
            )}

            {/* Step 2: Phone Code Verification */}
            {step === 'phone-code' && (
              <form onSubmit={handlePhoneCodeSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-success-100 rounded-full mb-4">
                    <span className="material-icons text-success-600">smartphone</span>
                  </div>
                  <p className="text-body-medium text-surface-600">
                    We sent a verification code to your phone number
                  </p>
                </div>

                <div className="material-textfield">
                  <input
                    type="text"
                    value={phoneCode}
                    onChange={(e) => {
                      const numericCode = e.target.value.replace(/\D/g, '');
                      setPhoneCode(numericCode);
                    }}
                    className="material-textfield-input peer text-center text-lg tracking-widest font-mono"
                    placeholder=" "
                    maxLength="6"
                    autoFocus
                    required
                  />
                  <label className="material-textfield-label">Verification Code</label>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-body-small text-surface-500">
                      Enter 5-digit code
                    </span>
                    <button
                      type="button"
                      onClick={handleRequestNewCode}
                      disabled={loading}
                      className="material-button-text text-primary-600 hover:text-primary-700"
                    >
                      <span className="material-icons text-sm mr-1">refresh</span>
                      <span className="text-body-small">Resend</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || phoneCode.length < 5}
                  className={`material-button-filled w-full ${loading ? 'material-loading' : ''}`}
                >
                  {loading && <div className="material-spinner mr-2" />}
                  <span className="material-icons mr-2 text-sm">verified</span>
                  Verify Code
                </button>
              </form>
            )}

            {/* Step 3: Two-Factor Authentication */}
            {step === '2fa' && (
              <form onSubmit={handle2FASubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-warning-100 rounded-full mb-4">
                    <span className="material-icons text-warning-600">security</span>
                  </div>
                  <p className="text-body-medium text-surface-600">
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
                  <label className="material-textfield-label">2FA Password</label>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={loading || !twoFAPassword.trim()}
                    className={`material-button-filled w-full ${loading ? 'material-loading' : ''}`}
                  >
                    {loading && <div className="material-spinner mr-2" />}
                    <span className="material-icons mr-2 text-sm">lock</span>
                    Complete Authentication
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
                    <span className="material-icons mr-2 text-sm">arrow_back</span>
                    Back to Verification
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-surface-100 bg-surface-50 rounded-b-xl">
            <div className="flex items-center justify-center text-body-small text-surface-500">
              <span className="material-icons text-sm mr-2">lock</span>
              Your credentials are encrypted and secure
            </div>
          </div>
        </div>

        {/* Made with Emergent */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center text-body-small text-surface-400">
            <span className="material-icons text-sm mr-2">flash_on</span>
            Made with Emergent
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramSetup;