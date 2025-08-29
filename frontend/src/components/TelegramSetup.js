import { useState } from 'react';
import axios from 'axios';

const TelegramSetup = ({ onAuthSuccess }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    api_id: '',
    api_hash: '',
    phone_number: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ type: '', message: '' });

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 5000);
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Save configuration
      await axios.post('/telegram/config', formData);
      
      // Send verification code
      const response = await axios.post('/telegram/send-code', {
        phone_number: formData.phone_number
      });

      if (response.data.success) {
        setStep(2);
        showNotification('success', 'Verification code sent to your phone!');
      }
    } catch (error) {
      console.error('Config/Send code error:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to send verification code. Please check your credentials.';
      setError(errorMessage);
      showNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/telegram/verify-code', {
        code: verificationCode
      });

      if (response.data.success) {
        if (response.data.requires_2fa) {
          setStep(3);
          showNotification('info', 'Two-factor authentication required');
        } else {
          showNotification('success', 'Authentication successful!');
          setTimeout(onAuthSuccess, 1000);
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      const errorMessage = error.response?.data?.detail || 'Invalid verification code. Please try again.';
      setError(errorMessage);
      showNotification('error', errorMessage);
      
      // Clear code on error for better UX
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/telegram/verify-2fa', {
        password: twoFactorPassword
      });

      if (response.data.success) {
        showNotification('success', 'Two-factor authentication successful!');
        setTimeout(onAuthSuccess, 1000);
      }
    } catch (error) {
      console.error('2FA error:', error);
      const errorMessage = error.response?.data?.detail || 'Invalid password. Please try again.';
      setError(errorMessage);
      showNotification('error', errorMessage);
      setTwoFactorPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getProgressPercentage = () => {
    return (step / 3) * 100;
  };

  return (
    <div className="min-h-screen bg-telegram-bg flex items-center justify-center p-4">
      {/* Notification */}
      {notification.message && (
        <div className={`fixed top-6 right-6 z-50 tg-card-elevated p-4 border-l-4 ${
          notification.type === 'success' ? 'border-telegram-green' :
          notification.type === 'error' ? 'border-telegram-red' : 'border-telegram-blue'
        } tg-scale-in`}>
          <div className="flex items-center space-x-3">
            <span className={`material-icons ${
              notification.type === 'success' ? 'text-telegram-green' :
              notification.type === 'error' ? 'text-telegram-red' : 'text-telegram-blue'
            }`}>
              {notification.type === 'success' ? 'check_circle' :
               notification.type === 'error' ? 'error' : 'info'}
            </span>
            <span className="tg-body">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="w-full max-w-md tg-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-telegram-blue rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-telegram">
            <span className="material-icons text-white text-3xl">telegram</span>
          </div>
          <h1 className="tg-heading-1 mb-2">Telegram API Setup</h1>
          <p className="tg-body-secondary">Connect your Telegram account to start automation</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between text-xs mb-2">
            <span className="tg-caption">Step {step} of 3</span>
            <span className="tg-caption">{Math.round(getProgressPercentage())}%</span>
          </div>
          <div className="w-full bg-telegram-elevated rounded-full h-2">
            <div 
              className="bg-telegram-blue h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        <div className="tg-card-elevated p-8">
          {/* Step 1: API Credentials */}
          {step === 1 && (
            <form onSubmit={handleConfigSubmit} className="space-y-6">
              <div>
                <h2 className="tg-heading-2 mb-4">Enter API Credentials</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block tg-body font-medium mb-2">API ID</label>
                    <input
                      type="text"
                      value={formData.api_id}
                      onChange={(e) => handleInputChange('api_id', e.target.value)}
                      className="fluent-input"
                      placeholder="Your API ID"
                      required
                    />
                  </div>

                  <div>
                    <label className="block tg-body font-medium mb-2">API Hash</label>
                    <input
                      type="text"
                      value={formData.api_hash}
                      onChange={(e) => handleInputChange('api_hash', e.target.value)}
                      className="fluent-input"
                      placeholder="Your API Hash"
                      required
                    />
                  </div>

                  <div>
                    <label className="block tg-body font-medium mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => handleInputChange('phone_number', e.target.value)}
                      className="fluent-input"
                      placeholder="+1234567890"
                      required
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="tg-card p-4 border-telegram-red border-opacity-30 bg-telegram-red bg-opacity-10">
                  <p className="tg-body text-telegram-red">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !formData.api_id || !formData.api_hash || !formData.phone_number}
                className="fluent-btn-primary w-full"
              >
                {loading && <div className="tg-spinner mr-2" />}
                Continue
              </button>

              {/* Help Section */}
              <div className="tg-card p-4 border-telegram-blue border-opacity-30 bg-telegram-blue bg-opacity-10">
                <div className="flex items-start space-x-3">
                  <span className="material-icons text-telegram-blue text-lg">help_outline</span>
                  <div>
                    <h3 className="tg-body font-medium text-telegram-blue mb-2">Need API Credentials?</h3>
                    <p className="tg-caption text-telegram-blue">
                      Get your API ID and Hash from <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-telegram-blueHover">my.telegram.org</a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="tg-card p-4 border-telegram-green border-opacity-30 bg-telegram-green bg-opacity-10">
                <div className="flex items-center space-x-3">
                  <span className="material-icons text-telegram-green text-lg">security</span>
                  <p className="tg-caption text-telegram-green">Your credentials are encrypted and secure</p>
                </div>
              </div>
            </form>
          )}

          {/* Step 2: Phone Verification */}
          {step === 2 && (
            <form onSubmit={handleVerificationSubmit} className="space-y-6">
              <div>
                <h2 className="tg-heading-2 mb-4">Enter Verification Code</h2>
                <p className="tg-body-secondary mb-4">
                  We've sent a verification code to {formData.phone_number}
                </p>

                <div>
                  <label className="block tg-body font-medium mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 7))}
                    className="fluent-input text-center text-2xl tracking-wider"
                    placeholder="12345"
                    maxLength="7"
                    required
                  />
                  <p className="tg-caption mt-2">
                    Enter Code ({verificationCode.length}/5)
                  </p>
                </div>
              </div>

              {error && (
                <div className="tg-card p-4 border-telegram-red border-opacity-30 bg-telegram-red bg-opacity-10">
                  <p className="tg-body text-telegram-red">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || verificationCode.length < 5}
                className="fluent-btn-primary w-full"
              >
                {loading && <div className="tg-spinner mr-2" />}
                Verify
              </button>
            </form>
          )}

          {/* Step 3: 2FA Password */}
          {step === 3 && (
            <form onSubmit={handle2FASubmit} className="space-y-6">
              <div>
                <h2 className="tg-heading-2 mb-4">Two-Factor Authentication</h2>
                <p className="tg-body-secondary mb-4">
                  Enter your Telegram password to complete authentication
                </p>

                <div>
                  <label className="block tg-body font-medium mb-2">Password</label>
                  <input
                    type="password"
                    value={twoFactorPassword}
                    onChange={(e) => setTwoFactorPassword(e.target.value)}
                    className="fluent-input"
                    placeholder="Your Telegram password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="tg-card p-4 border-telegram-red border-opacity-30 bg-telegram-red bg-opacity-10">
                  <p className="tg-body text-telegram-red">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !twoFactorPassword}
                className="fluent-btn-primary w-full"
              >
                {loading && <div className="tg-spinner mr-2" />}
                Complete Authentication
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramSetup;