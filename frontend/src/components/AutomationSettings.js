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
      <div className="space-y-6">
        <div className="material-fade-in">
          <div className="mb-6">
            <div className="h-8 bg-surface-200 rounded-md w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-surface-100 rounded w-64 animate-pulse"></div>
          </div>
          
          <div className="material-card-filled p-6 animate-pulse">
            <div className="h-6 bg-surface-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              <div className="h-12 bg-surface-100 rounded"></div>
              <div className="h-12 bg-surface-100 rounded"></div>
              <div className="h-10 bg-surface-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 material-fade-in">
      {/* Material Design Header */}
      <div>
        <h1 className="text-headline-medium text-surface-900 font-normal mb-2">Settings</h1>
        <p className="text-body-large text-surface-600">Configure automation system and Telegram account</p>
      </div>

      {/* Material Design Tabs */}
      <div className="flex space-x-2">
        <button
          onClick={() => setActiveTab('automation')}
          className={`material-button-text px-6 py-3 rounded-full ${
            activeTab === 'automation' 
              ? 'bg-primary-100 text-primary-700' 
              : 'text-surface-600'
          }`}
        >
          <span className="material-icons mr-2">settings</span>
          Automation
        </button>
        <button
          onClick={() => setActiveTab('telegram')}
          className={`material-button-text px-6 py-3 rounded-full ${
            activeTab === 'telegram' 
              ? 'bg-primary-100 text-primary-700' 
              : 'text-surface-600'
          }`}
        >
          <span className="material-icons mr-2">chat</span>
          Telegram
        </button>
      </div>

      {/* Automation Settings Tab */}
      {activeTab === 'automation' && automationConfig && (
        <div className="space-y-6">
          <div className="material-card-elevated p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="material-icons text-primary-700 text-lg">tune</span>
              </div>
              <h2 className="text-title-large font-medium text-surface-900">
                Automation Configuration
              </h2>
            </div>
            
            <form onSubmit={handleAutomationUpdate} className="space-y-6">
              <div className="space-y-6">
                {/* Message Delay Settings */}
                <div>
                  <h3 className="text-title-medium font-medium text-surface-900 mb-3">
                    Message Delay Settings
                  </h3>
                  <div className="material-grid material-grid-cols-2">
                    <div className="material-textfield">
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={automationConfig.message_delay_min}
                        onChange={(e) => setAutomationConfig({
                          ...automationConfig,
                          message_delay_min: parseInt(e.target.value)
                        })}
                        className="material-textfield-input peer"
                        placeholder=" "
                      />
                      <label className="material-textfield-label">
                        Minimum Delay (seconds)
                      </label>
                    </div>
                    
                    <div className="material-textfield">
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={automationConfig.message_delay_max}
                        onChange={(e) => setAutomationConfig({
                          ...automationConfig,
                          message_delay_max: parseInt(e.target.value)
                        })}
                        className="material-textfield-input peer"
                        placeholder=" "
                      />
                      <label className="material-textfield-label">
                        Maximum Delay (seconds)
                      </label>
                    </div>
                  </div>
                  <p className="text-body-small text-surface-600 mt-2">
                    Random delay between {automationConfig.message_delay_min} - {automationConfig.message_delay_max} seconds
                  </p>
                </div>

                {/* Cycle Delay Settings */}
                <div>
                  <h3 className="text-title-medium font-medium text-surface-900 mb-3">
                    Cycle Delay Settings
                  </h3>
                  <div className="material-grid material-grid-cols-2">
                    <div className="material-textfield">
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
                        className="material-textfield-input peer"
                        placeholder=" "
                      />
                      <label className="material-textfield-label">
                        Minimum Delay (hours)
                      </label>
                    </div>
                    
                    <div className="material-textfield">
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
                        className="material-textfield-input peer"
                        placeholder=" "
                      />
                      <label className="material-textfield-label">
                        Maximum Delay (hours)
                      </label>
                    </div>
                  </div>
                  <p className="text-body-small text-surface-600 mt-2">
                    Random delay {formatTimeRange(automationConfig.cycle_delay_min, automationConfig.cycle_delay_max, 'hours')}
                  </p>
                </div>

                {/* Auto Cleanup Info */}
                <div className="material-card-outlined border-primary-300 bg-primary-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="material-icons text-primary-700 text-lg">info</span>
                    </div>
                    <div>
                      <h4 className="text-title-small font-medium text-primary-800 mb-2">
                        Auto Cleanup Blacklist
                      </h4>
                      <p className="text-body-medium text-primary-700">
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
                className={`material-button-filled w-full ${actionLoading ? 'material-loading' : ''}`}
              >
                {actionLoading && <div className="material-spinner mr-3" />}
                <span className="material-icons mr-2">save</span>
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
          <div className="material-card-elevated p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="material-icons text-primary-700 text-lg">chat</span>
              </div>
              <h2 className="text-title-large font-medium text-surface-900">
                Current Telegram Configuration
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="material-grid material-grid-cols-2">
                <div className="material-card-outlined p-4 rounded-lg">
                  <h4 className="text-title-small font-medium text-surface-900 mb-2">API ID</h4>
                  <p className="text-body-medium text-surface-600">
                    {telegramSettings.api_id || 'Not configured'}
                  </p>
                </div>
                
                <div className="material-card-outlined p-4 rounded-lg">
                  <h4 className="text-title-small font-medium text-surface-900 mb-2">Phone Number</h4>
                  <p className="text-body-medium text-surface-600">
                    {telegramSettings.phone_number || 'Not configured'}
                  </p>
                </div>
              </div>

              <div className="material-card-outlined p-4 rounded-lg">
                <h4 className="text-title-small font-medium text-surface-900 mb-3">Authentication Status</h4>
                <div className="flex items-center space-x-3">
                  <div className={`material-status-${telegramConfig?.is_authenticated ? 'online' : 'offline'}`}></div>
                  <span className="text-body-medium text-surface-700">
                    {telegramConfig?.is_authenticated ? 'Authenticated' : 'Not authenticated'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowTelegramModal(true)}
                  className="material-button-filled flex-1"
                >
                  <span className="material-icons mr-2">edit</span>
                  Update Configuration
                </button>
                {telegramConfig?.is_authenticated && (
                  <button
                    onClick={handleLogout}
                    className="material-button-outlined border-error-600 text-error-600 hover:bg-error-50 flex-1"
                  >
                    <span className="material-icons mr-2">logout</span>
                    Logout from Telegram
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="material-card-elevated p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center">
                <span className="material-icons text-secondary-700 text-lg">help</span>
              </div>
              <h2 className="text-title-large font-medium text-surface-900">
                How to Get Telegram API Credentials
              </h2>
            </div>
            
            <div className="space-y-4">
              {[
                {
                  step: 1,
                  text: 'Visit my.telegram.org and login with your phone number',
                  link: 'https://my.telegram.org'
                },
                {
                  step: 2,
                  text: 'Click on "API development tools" and create a new application'
                },
                {
                  step: 3,
                  text: 'Copy your API ID and API Hash from the created application'
                },
                {
                  step: 4,
                  text: 'Use the same phone number that\'s associated with your Telegram account'
                }
              ].map((item) => (
                <div key={item.step} className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-secondary-100 text-secondary-700 rounded-full flex items-center justify-center text-label-small font-medium flex-shrink-0">
                    {item.step}
                  </div>
                  <p className="text-body-medium text-surface-700">
                    {item.link ? (
                      <>Visit <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{item.link}</a> and login with your phone number</>
                    ) : (
                      item.text
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Material Design Telegram Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 material-dialog-backdrop">
          <div className="material-dialog w-full max-w-md material-scale-in">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-title-large font-medium text-surface-900">
                  Update Telegram Configuration
                </h2>
                <button
                  onClick={() => setShowTelegramModal(false)}
                  className="material-button-text p-2 -mr-2"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              
              <form onSubmit={handleTelegramUpdate} className="space-y-6">
                <div className="material-textfield">
                  <input
                    type="text"
                    value={telegramSettings.api_id}
                    onChange={(e) => setTelegramSettings({
                      ...telegramSettings,
                      api_id: e.target.value
                    })}
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
                    value={telegramSettings.api_hash}
                    onChange={(e) => setTelegramSettings({
                      ...telegramSettings,
                      api_hash: e.target.value
                    })}
                    className="material-textfield-input peer"
                    placeholder=" "
                  />
                  <label className="material-textfield-label">
                    API Hash
                  </label>
                  {telegramSettings.api_hash === '***HIDDEN***' && (
                    <p className="text-body-small text-surface-500 mt-1">
                      Leave empty to keep current API Hash
                    </p>
                  )}
                </div>

                <div className="material-textfield">
                  <input
                    type="tel"
                    value={telegramSettings.phone_number}
                    onChange={(e) => setTelegramSettings({
                      ...telegramSettings,
                      phone_number: e.target.value
                    })}
                    className="material-textfield-input peer"
                    placeholder=" "
                    required
                  />
                  <label className="material-textfield-label">
                    Phone Number
                  </label>
                </div>

                <div className="material-card-outlined border-warning-300 bg-warning-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <span className="material-icons text-warning-700 text-lg">warning</span>
                    <p className="text-body-small text-warning-700">
                      Changing these settings will require re-authentication with Telegram
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowTelegramModal(false)}
                    className="material-button-outlined"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className={`material-button-filled ${actionLoading ? 'material-loading' : ''}`}
                  >
                    {actionLoading && <div className="material-spinner mr-2" />}
                    <span className="material-icons mr-2">save</span>
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