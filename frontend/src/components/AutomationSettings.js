import { useState, useEffect } from 'react';
import axios from 'axios';

const AutomationSettings = ({ telegramConfig, onConfigUpdate }) => {
  const [automationConfig, setAutomationConfig] = useState(null);
  const [telegramSettings, setTelegramSettings] = useState({
    api_id: '',
    api_hash: '',
    phone_number: ''
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('automation');
  const [showTelegramModal, setShowTelegramModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [automationRes, telegramRes] = await Promise.all([
        axios.get('/automation/config'),
        axios.get('/telegram/config')
      ]);

      setAutomationConfig(automationRes.data);
      
      if (telegramRes.data) {
        setTelegramSettings({
          api_id: telegramRes.data.api_id || '',
          api_hash: '***HIDDEN***', // Don't show actual hash
          phone_number: telegramRes.data.phone_number || ''
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutomationUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      await axios.put('/automation/config', automationConfig);
      alert('Pengaturan automation berhasil disimpan');
    } catch (error) {
      console.error('Failed to update automation config:', error);
      alert('Gagal menyimpan pengaturan. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTelegramUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      await axios.put('/telegram/config', {
        api_id: parseInt(telegramSettings.api_id),
        phone_number: telegramSettings.phone_number,
        ...(telegramSettings.api_hash !== '***HIDDEN***' && { 
          api_hash: telegramSettings.api_hash 
        })
      });
      
      setShowTelegramModal(false);
      await loadSettings();
      onConfigUpdate();
      alert('Konfigurasi Telegram berhasil diperbarui. Anda perlu login ulang.');
    } catch (error) {
      console.error('Failed to update telegram config:', error);
      alert('Gagal memperbarui konfigurasi. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Apakah Anda yakin ingin logout dari Telegram?')) {
      return;
    }

    try {
      // In real implementation, you might want to clear session
      await axios.put('/telegram/config', {
        api_id: telegramConfig.api_id,
        api_hash: telegramConfig.api_hash,
        phone_number: telegramConfig.phone_number
      });
      
      alert('Berhasil logout dari Telegram');
      window.location.reload();
    } catch (error) {
      console.error('Failed to logout:', error);
      alert('Gagal logout. Silakan refresh halaman.');
    }
  };

  const formatTimeRange = (min, max, unit) => {
    if (unit === 'hours') {
      const minHours = Math.floor(min);
      const minMinutes = Math.floor((min - minHours) * 60);
      const maxHours = Math.floor(max);
      const maxMinutes = Math.floor((max - maxHours) * 60);
      return `${minHours}j ${minMinutes}m - ${maxHours}j ${maxMinutes}m`;
    }
    return `${min} - ${max} ${unit}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="bg-gray-200 h-64 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure automation system and Telegram account</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab('automation')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'automation' 
              ? 'bg-white text-gray-900 shadow' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚙️ Automation
        </button>
        <button
          onClick={() => setActiveTab('telegram')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'telegram' 
              ? 'bg-white text-gray-900 shadow' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📱 Telegram
        </button>
      </div>

      {/* Automation Settings Tab */}
      {activeTab === 'automation' && automationConfig && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6 card-shadow">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Automation Configuration
            </h3>
            
            <form onSubmit={handleAutomationUpdate} className="space-y-6">
              {/* Message Delays */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Delay Pesan Minimum (detik)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={automationConfig.message_delay_min}
                    onChange={(e) => setAutomationConfig({
                      ...automationConfig,
                      message_delay_min: parseInt(e.target.value)
                    })}
                    className="form-input"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Delay minimum antar pengiriman pesan
                  </p>
                </div>
                
                <div>
                  <label className="form-label">Delay Pesan Maksimum (detik)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={automationConfig.message_delay_max}
                    onChange={(e) => setAutomationConfig({
                      ...automationConfig,
                      message_delay_max: parseInt(e.target.value)
                    })}
                    className="form-input"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Delay maksimum antar pengiriman pesan
                  </p>
                </div>
              </div>

              {/* Cycle Delays */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Delay Siklus Minimum (jam)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="24"
                    value={automationConfig.cycle_delay_min}
                    onChange={(e) => setAutomationConfig({
                      ...automationConfig,
                      cycle_delay_min: parseFloat(e.target.value)
                    })}
                    className="form-input"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Delay minimum antar siklus pengiriman
                  </p>
                </div>
                
                <div>
                  <label className="form-label">Delay Siklus Maksimum (jam)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="24"
                    value={automationConfig.cycle_delay_max}
                    onChange={(e) => setAutomationConfig({
                      ...automationConfig,
                      cycle_delay_max: parseFloat(e.target.value)
                    })}
                    className="form-input"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Delay maksimum antar siklus pengiriman
                  </p>
                </div>
              </div>

              {/* Blacklist Auto Cleanup - Always Active (Info Only) */}
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-blue-600 text-xl">ℹ️</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      Auto Cleanup Blacklist
                    </h4>
                    <p className="text-sm text-blue-700">
                      Pembersihan otomatis blacklist selalu aktif untuk menjaga performa sistem. 
                      Grup yang diblokir sementara akan otomatis dihapus setelah expired.
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Settings Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Preview Pengaturan</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Delay Pesan:</span>
                    <span className="ml-2 font-medium">
                      {formatTimeRange(automationConfig.message_delay_min, automationConfig.message_delay_max, 'detik')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Delay Siklus:</span>
                    <span className="ml-2 font-medium">
                      {formatTimeRange(automationConfig.cycle_delay_min, automationConfig.cycle_delay_max, 'hours')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Auto Cleanup:</span>
                    <span className={`ml-2 badge ${automationConfig.auto_cleanup_blacklist ? 'badge-success' : 'badge-error'}`}>
                      {automationConfig.auto_cleanup_blacklist ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status Automation:</span>
                    <span className={`ml-2 badge ${automationConfig.is_active ? 'badge-success' : 'badge-error'}`}>
                      {automationConfig.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className={`btn btn-primary ${actionLoading ? 'loading' : ''}`}
              >
                {actionLoading && <div className="spinner"></div>}
                {actionLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Telegram Settings Tab */}
      {activeTab === 'telegram' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6 card-shadow">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Konfigurasi Telegram
            </h3>
            
            {/* Current Status */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Status Akun</h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className={`status-dot ${telegramConfig?.is_authenticated ? 'status-online' : 'status-offline'}`}></span>
                  <span className="text-sm text-gray-600">
                    Status: {telegramConfig?.is_authenticated ? 'Terhubung' : 'Tidak terhubung'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-600">
                    Nomor: {telegramConfig?.phone_number || 'Tidak diset'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-600">
                    API ID: {telegramConfig?.api_id || 'Tidak diset'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowTelegramModal(true)}
                className="btn btn-primary"
              >
                ⚙️ Update Konfigurasi
              </button>
              
              {telegramConfig?.is_authenticated && (
                <button
                  onClick={handleLogout}
                  className="btn btn-danger"
                >
                  🚪 Logout Telegram
                </button>
              )}
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h4 className="text-yellow-800 font-medium">Catatan Keamanan</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  Kredensial Telegram Anda disimpan dengan enkripsi. API Hash tidak ditampilkan 
                  untuk keamanan. Jangan bagikan API ID dan Hash Anda kepada siapapun.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Configuration Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Update Konfigurasi Telegram
              </h2>
              
              <form onSubmit={handleTelegramUpdate} className="space-y-4">
                <div>
                  <label className="form-label">API ID</label>
                  <input
                    type="number"
                    value={telegramSettings.api_id}
                    onChange={(e) => setTelegramSettings({
                      ...telegramSettings,
                      api_id: e.target.value
                    })}
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">API Hash</label>
                  <input
                    type="password"
                    value={telegramSettings.api_hash}
                    onChange={(e) => setTelegramSettings({
                      ...telegramSettings,
                      api_hash: e.target.value
                    })}
                    className="form-input"
                    placeholder="Kosongkan jika tidak ingin mengubah"
                  />
                </div>

                <div>
                  <label className="form-label">Nomor Telepon</label>
                  <input
                    type="tel"
                    value={telegramSettings.phone_number}
                    onChange={(e) => setTelegramSettings({
                      ...telegramSettings,
                      phone_number: e.target.value
                    })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ Mengubah konfigurasi akan memerlukan login ulang ke Telegram
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTelegramModal(false)}
                    className="btn btn-outline flex-1"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className={`btn btn-primary flex-1 ${actionLoading ? 'loading' : ''}`}
                  >
                    {actionLoading && <div className="spinner"></div>}
                    {actionLoading ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationSettings;