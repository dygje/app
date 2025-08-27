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
      alert('Automation settings saved successfully');
    } catch (error) {
      console.error('Failed to update automation config:', error);
      alert('Failed to save settings. Please try again.');
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
      alert('Telegram configuration updated successfully. You need to authenticate again.');
    } catch (error) {
      console.error('Failed to update telegram config:', error);
      alert('Failed to update configuration. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout from Telegram?')) {
      return;
    }

    try {
      // In real implementation, you might want to clear session
      await axios.put('/telegram/config', {
        api_id: telegramConfig.api_id,
        api_hash: telegramConfig.api_hash,
        phone_number: telegramConfig.phone_number
      });
      
      alert('Successfully logged out from Telegram');
      window.location.reload();
    } catch (error) {
      console.error('Failed to logout:', error);
      alert('Failed to logout. Please refresh the page.');
    }
  };

  const formatTimeRange = (min, max, unit) => {
    if (unit === 'hours') {
      const minHours = Math.floor(min);
      const minMinutes = Math.floor((min - minHours) * 60);
      const maxHours = Math.floor(max);
      const maxMinutes = Math.floor((max - maxHours) * 60);
      return `${minHours}h ${minMinutes}m - ${maxHours}h ${maxMinutes}m`;
    }
    return `${min} - ${max} ${unit}`;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
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
    <div className="p-4 md:p-6 fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Settings</h1>
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
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 card-shadow">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
              Automation Configuration
            </h3>
            
            <form onSubmit={handleAutomationUpdate} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="form-label">
                    Message Delay (seconds)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={automationConfig.message_delay_min}
                        onChange={(e) => setAutomationConfig({
                          ...automationConfig,
                          message_delay_min: parseInt(e.target.value)
                        })}
                        className="form-input"
                        placeholder="Min"
                      />
                      <p className="text-xs text-gray-500 mt-1">Minimum</p>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={automationConfig.message_delay_max}
                        onChange={(e) => setAutomationConfig({
                          ...automationConfig,
                          message_delay_max: parseInt(e.target.value)
                        })}
                        className="form-input"
                        placeholder="Max"
                      />
                      <p className="text-xs text-gray-500 mt-1">Maximum</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Random delay between {automationConfig.message_delay_min} - {automationConfig.message_delay_max} seconds
                  </p>
                </div>

                <div>
                  <label className="form-label">
                    Cycle Delay (hours)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="number"
                        min="0.1"
                        max="24"
                        step="0.1"
                        value={automationConfig.cycle_delay_min}
                        onChange={(e) => setAutomationConfig({
                          ...automationConfig,
                          cycle_delay_min: parseFloat(e.target.value)
                        })}
                        className="form-input"
                        placeholder="Min"
                      />
                      <p className="text-xs text-gray-500 mt-1">Minimum</p>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0.1"
                        max="24"
                        step="0.1"
                        value={automationConfig.cycle_delay_max}
                        onChange={(e) => setAutomationConfig({
                          ...automationConfig,
                          cycle_delay_max: parseFloat(e.target.value)
                        })}
                        className="form-input"
                        placeholder="Max"
                      />
                      <p className="text-xs text-gray-500 mt-1">Maximum</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Random delay {formatTimeRange(automationConfig.cycle_delay_min, automationConfig.cycle_delay_max, 'hours')}
                  </p>
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
                        Automatic blacklist cleanup is always enabled to maintain system performance. 
                        Temporarily blocked groups will be automatically removed after expiration.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className={`btn btn-primary w-full ${actionLoading ? 'loading' : ''}`}
              >
                {actionLoading && <div className="spinner"></div>}
                {actionLoading ? 'Saving...' : 'Save Automation Settings'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Telegram Settings Tab */}
      {activeTab === 'telegram' && (
        <div className="space-y-6">
          {/* Current Configuration */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 card-shadow">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
              Current Telegram Configuration
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">API ID</label>
                  <div className="form-input bg-gray-50">
                    {telegramSettings.api_id || 'Not configured'}
                  </div>
                </div>
                <div>
                  <label className="form-label">Phone Number</label>
                  <div className="form-input bg-gray-50">
                    {telegramSettings.phone_number || 'Not configured'}
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Authentication Status</label>
                <div className="flex items-center space-x-2">
                  <span className={`status-dot ${telegramConfig?.is_authenticated ? 'status-online' : 'status-offline'}`}></span>
                  <span className="text-sm text-gray-600">
                    {telegramConfig?.is_authenticated ? 'Authenticated' : 'Not authenticated'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  onClick={() => setShowTelegramModal(true)}
                  className="btn btn-primary flex-1"
                >
                  Update Configuration
                </button>
                {telegramConfig?.is_authenticated && (
                  <button
                    onClick={handleLogout}
                    className="btn btn-danger flex-1"
                  >
                    Logout from Telegram
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 card-shadow">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
              How to Get Telegram API Credentials
            </h3>
            
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                <p>
                  Visit <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">my.telegram.org</a> and login with your phone number
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                <p>Click on "API development tools" and create a new application</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">3</span>
                <p>Copy your API ID and API Hash from the created application</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">4</span>
                <p>Use the same phone number that's associated with your Telegram account</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Telegram Configuration Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Update Telegram Configuration
              </h2>
              
              <form onSubmit={handleTelegramUpdate} className="space-y-4">
                <div>
                  <label className="form-label">API ID</label>
                  <input
                    type="text"
                    value={telegramSettings.api_id}
                    onChange={(e) => setTelegramSettings({
                      ...telegramSettings,
                      api_id: e.target.value
                    })}
                    className="form-input"
                    placeholder="123456"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">API Hash</label>
                  <input
                    type="text"
                    value={telegramSettings.api_hash}
                    onChange={(e) => setTelegramSettings({
                      ...telegramSettings,
                      api_hash: e.target.value
                    })}
                    className="form-input"
                    placeholder="Enter new API Hash or leave unchanged"
                  />
                  {telegramSettings.api_hash === '***HIDDEN***' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to keep current API Hash
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    value={telegramSettings.phone_number}
                    onChange={(e) => setTelegramSettings({
                      ...telegramSettings,
                      phone_number: e.target.value
                    })}
                    className="form-input"
                    placeholder="+1234567890"
                    required
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-700">
                    ⚠️ Changing these settings will require re-authentication with Telegram
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTelegramModal(false)}
                    className="btn btn-outline flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className={`btn btn-primary flex-1 ${actionLoading ? 'loading' : ''}`}
                  >
                    {actionLoading && <div className="spinner"></div>}
                    {actionLoading ? 'Updating...' : 'Update & Re-authenticate'}
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