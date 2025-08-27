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
      setSuccess('Konfigurasi berhasil disimpan');
      
      // Send authentication code
      setTimeout(async () => {
        try {
          await axios.post('/telegram/send-code');
          setSuccess('Kode verifikasi telah dikirim ke nomor Anda');
          setStep('phone-code');
        } catch (err) {
          setError(err.response?.data?.detail || 'Gagal mengirim kode verifikasi');
        }
        setLoading(false);
      }, 1000);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal menyimpan konfigurasi');
      setLoading(false);
    }
  };

  const handlePhoneCodeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/telegram/verify-code', {
        phone_code: phoneCode
      });

      if (response.data.requires_2fa) {
        setSuccess('Masukkan password 2FA Anda');
        setStep('2fa');
      } else {
        setSuccess('Autentikasi berhasil!');
        setTimeout(() => {
          onAuthSuccess();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Kode verifikasi tidak valid');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/telegram/verify-2fa', {
        password: twoFAPassword
      });

      setSuccess('Autentikasi 2FA berhasil!');
      setTimeout(() => {
        onAuthSuccess();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Password 2FA tidak valid');
    } finally {
      setLoading(false);
    }
  };

  const resetToConfig = () => {
    setStep('config');
    setError('');
    setSuccess('');
    setPhoneCode('');
    setTwoFAPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📱</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Telegram Automation
          </h1>
          <p className="text-gray-600">
            {step === 'config' && 'Konfigurasi API Telegram'}
            {step === 'phone-code' && 'Verifikasi Nomor Telepon'}
            {step === '2fa' && 'Autentikasi 2FA'}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'config' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'
            }`}>
              1
            </div>
            <div className={`w-8 h-1 ${step !== 'config' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'phone-code' ? 'bg-blue-600 text-white' : 
              step === '2fa' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              2
            </div>
            <div className={`w-8 h-1 ${step === '2fa' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === '2fa' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              3
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">
            {success}
          </div>
        )}

        {/* Configuration Form */}
        {step === 'config' && (
          <form onSubmit={handleConfigSubmit} className="space-y-4">
            <div>
              <label className="form-label">API ID</label>
              <input
                type="number"
                value={config.api_id}
                onChange={(e) => setConfig({...config, api_id: e.target.value})}
                className="form-input"
                placeholder="Masukkan API ID dari my.telegram.org"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Dapatkan dari <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">my.telegram.org</a>
              </p>
            </div>

            <div>
              <label className="form-label">API Hash</label>
              <input
                type="text"
                value={config.api_hash}
                onChange={(e) => setConfig({...config, api_hash: e.target.value})}
                className="form-input"
                placeholder="Masukkan API Hash dari my.telegram.org"
                required
              />
            </div>

            <div>
              <label className="form-label">Nomor Telepon</label>
              <input
                type="tel"
                value={config.phone_number}
                onChange={(e) => setConfig({...config, phone_number: e.target.value})}
                className="form-input"
                placeholder="+62812345678"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Masukkan nomor dengan kode negara (contoh: +62812345678)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
            >
              {loading && <div className="spinner"></div>}
              {loading ? 'Menyimpan...' : 'Lanjutkan'}
            </button>
          </form>
        )}

        {/* Phone Code Verification */}
        {step === 'phone-code' && (
          <form onSubmit={handlePhoneCodeSubmit} className="space-y-4">
            <div>
              <label className="form-label">Kode Verifikasi</label>
              <input
                type="text"
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                className="form-input text-center text-2xl tracking-widest"
                placeholder="12345"
                maxLength="5"
                required
              />
              <p className="text-xs text-gray-500 mt-1 text-center">
                Masukkan kode 5 digit yang dikirim ke {config.phone_number}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={resetToConfig}
                className="btn btn-outline flex-1"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`btn btn-primary flex-1 ${loading ? 'loading' : ''}`}
              >
                {loading && <div className="spinner"></div>}
                {loading ? 'Memverifikasi...' : 'Verifikasi'}
              </button>
            </div>
          </form>
        )}

        {/* 2FA Password */}
        {step === '2fa' && (
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div>
              <label className="form-label">Password 2FA</label>
              <input
                type="password"
                value={twoFAPassword}
                onChange={(e) => setTwoFAPassword(e.target.value)}
                className="form-input"
                placeholder="Masukkan password 2FA Anda"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Masukkan password Two-Factor Authentication Telegram Anda
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={resetToConfig}
                className="btn btn-outline flex-1"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`btn btn-primary flex-1 ${loading ? 'loading' : ''}`}
              >
                {loading && <div className="spinner"></div>}
                {loading ? 'Memverifikasi...' : 'Masuk'}
              </button>
            </div>
          </form>
        )}

        {/* Help Section */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Butuh Bantuan?</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Pastikan nomor telepon sudah terdaftar di Telegram</li>
            <li>• API ID dan Hash bisa didapat dari my.telegram.org</li>
            <li>• Kode verifikasi dikirim via SMS atau Telegram app</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TelegramSetup;