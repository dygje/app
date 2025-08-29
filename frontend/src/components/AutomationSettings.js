import { useState, useEffect } from 'react';
import axios from 'axios';

const AutomationSettings = ({ telegramConfig, onConfigUpdate }) => {
  const [config, setConfig] = useState({
    message_delay_min: 30,
    message_delay_max: 60,
    cycle_delay_min: 1,
    cycle_delay_max: 3,
    auto_cleanup_blacklist: true,
    is_active: false
  });
  const [telegramSettings, setTelegramSettings] = useState({
    api_id: '',
    api_hash: '',
    phone_number: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('automation');

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
      
      setConfig(automationRes.data);
      if (telegramRes.data) {
        setTelegramSettings({
          api_id: telegramRes.data.api_id || '',
          api_hash: telegramRes.data.api_hash || '',
          phone_number: telegramRes.data.phone_number || ''
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutomationSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await axios.put('/automation/config', config);
      alert('Automation settings saved successfully!');
    } catch (error) {
      console.error('Failed to save automation settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTelegramSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await axios.post('/telegram/config', telegramSettings);
      onConfigUpdate();
      alert('Telegram settings saved successfully!');
    } catch (error) {
      console.error('Failed to save Telegram settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatHours = (hours) => {
    if (hours < 1) {
      return `${Math.floor(hours * 60)}m`;
    }
    return `${Math.floor(hours)}h ${Math.floor((hours - Math.floor(hours)) * 60)}m`;
  };

  if (loading) {
    return (
      <div className="space-y-6 tg-fade-in">
        <div className="tg-card-elevated p-6 animate-pulse">
          <div className="h-8 bg-telegram-elevated rounded-telegram w-48 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-telegram-elevated rounded-telegram"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 tg-fade-in">
      {/* Header */}
      <div>
        <h1 className="tg-heading-1 mb-2">Settings</h1>
        <p className="tg-body-secondary">Configure your automation and Telegram settings</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 tg-card p-1 w-fit">
        <button
          onClick={() => setActiveTab('automation')}
          className={`px-6 py-3 rounded-fluent font-medium text-sm transition-all ${
            activeTab === 'automation'
              ? 'bg-telegram-blue text-white'
              : 'text-telegram-textSecondary hover:text-telegram-text hover:bg-telegram-elevated'
          }`}
        >
          <span className="material-icons text-sm mr-2">smart_toy</span>
          Automation
        </button>
        <button
          onClick={() => setActiveTab('telegram')}
          className={`px-6 py-3 rounded-fluent font-medium text-sm transition-all ${
            activeTab === 'telegram'
              ? 'bg-telegram-blue text-white'
              : 'text-telegram-textSecondary hover:text-telegram-text hover:bg-telegram-elevated'
          }`}
        >
          <span className="material-icons text-sm mr-2">telegram</span>
          Telegram
        </button>
      </div>

      {/* Automation Settings Tab */}
      {activeTab === 'automation' && (
        <form onSubmit={handleAutomationSave} className="space-y-6">
          <div className="tg-card-elevated p-6">
            <h2 className="tg-heading-2 mb-6">Message Timing</h2>
            
            <div className="space-y-6">
              {/* Message Delays */}
              <div>
                <h3 className="tg-heading-3 mb-4">Delay Between Messages</h3>
                <div className="tg-grid tg-grid-cols-2">
                  <div>
                    <label className="block tg-body font-medium mb-2">Minimum Delay (seconds)</label>
                    <input
                      type="number"
                      min="1"
                      max="3600"
                      value={config.message_delay_min}
                      onChange={(e) => setConfig(prev => ({ ...prev, message_delay_min: parseInt(e.target.value) }))}
                      className="fluent-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block tg-body font-medium mb-2">Maximum Delay (seconds)</label>
                    <input
                      type="number"
                      min="1"
                      max="3600"
                      value={config.message_delay_max}
                      onChange={(e) => setConfig(prev => ({ ...prev, message_delay_max: parseInt(e.target.value) }))}
                      className="fluent-input"
                      required
                    />
                  </div>
                </div>
                <p className="tg-caption mt-2">
                  Random delay between {config.message_delay_min}-{config.message_delay_max} seconds between messages
                </p>
              </div>

              {/* Cycle Delays */}
              <div>
                <h3 className="tg-heading-3 mb-4">Delay Between Cycles</h3>
                <div className="tg-grid tg-grid-cols-2">
                  <div>
                    <label className="block tg-body font-medium mb-2">Minimum Delay (hours)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      max="168"
                      value={config.cycle_delay_min}
                      onChange={(e) => setConfig(prev => ({ ...prev, cycle_delay_min: parseFloat(e.target.value) }))}
                      className="fluent-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block tg-body font-medium mb-2">Maximum Delay (hours)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      max="168"
                      value={config.cycle_delay_max}
                      onChange={(e) => setConfig(prev => ({ ...prev, cycle_delay_max: parseFloat(e.target.value) }))}
                      className="fluent-input"
                      required
                    />
                  </div>
                </div>
                <p className="tg-caption mt-2">
                  Random delay between {formatHours(config.cycle_delay_min)} - {formatHours(config.cycle_delay_max)} between complete cycles
                </p>
              </div>
            </div>
          </div>

          {/* Blacklist Settings - Information Only */}
          <div className="tg-card-elevated p-6">
            <h2 className="tg-heading-2 mb-6">System Settings</h2>
            
            <div className="tg-card border-telegram-green border-opacity-30 bg-telegram-green bg-opacity-10 p-4">
              <div className="flex items-center space-x-3">
                <span className="material-icons text-telegram-green text-xl">info</span>
                <div>
                  <h3 className="tg-body font-medium text-telegram-green mb-1">Auto Blacklist Cleanup</h3>
                  <p className="tg-caption text-telegram-green">
                    Automatic cleanup is always enabled to maintain optimal performance and comply with Telegram policies.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="fluent-btn-primary"
            >
              {saving && <div className="tg-spinner mr-2" />}
              Save Automation Settings
            </button>
          </div>
        </form>
      )}

      {/* Telegram Settings Tab */}
      {activeTab === 'telegram' && (
        <form onSubmit={handleTelegramSave} className="space-y-6">
          <div className="tg-card-elevated p-6">
            <h2 className="tg-heading-2 mb-6">Telegram API Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block tg-body font-medium mb-2">API ID</label>
                <input
                  type="text"
                  value={telegramSettings.api_id}
                  onChange={(e) => setTelegramSettings(prev => ({ ...prev, api_id: e.target.value }))}
                  className="fluent-input"
                  placeholder="Your Telegram API ID"
                  required
                />
              </div>

              <div>
                <label className="block tg-body font-medium mb-2">API Hash</label>
                <input
                  type="text"
                  value={telegramSettings.api_hash}
                  onChange={(e) => setTelegramSettings(prev => ({ ...prev, api_hash: e.target.value }))}
                  className="fluent-input"
                  placeholder="Your Telegram API Hash"
                  required
                />
              </div>

              <div>
                <label className="block tg-body font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={telegramSettings.phone_number}
                  onChange={(e) => setTelegramSettings(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="fluent-input"
                  placeholder="+1234567890"
                  required
                />
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="tg-card-elevated p-6">
            <h2 className="tg-heading-2 mb-4">How to Get API Credentials</h2>
            
            <div className="space-y-4">
              <div className="tg-card border-telegram-blue border-opacity-30 bg-telegram-blue bg-opacity-10 p-4">
                <div className="flex items-start space-x-3">
                  <span className="material-icons text-telegram-blue text-lg">info</span>
                  <div>
                    <h3 className="tg-body font-medium text-telegram-blue mb-2">Getting Your API Credentials</h3>
                    <ol className="tg-caption text-telegram-blue space-y-1 ml-4 list-decimal">
                      <li>Visit <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-telegram-blueHover">my.telegram.org</a></li>
                      <li>Log in with your phone number</li>
                      <li>Go to "API Development Tools"</li>
                      <li>Create a new application</li>
                      <li>Copy your API ID and API Hash</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="tg-card border-telegram-green border-opacity-30 bg-telegram-green bg-opacity-10 p-4">
                <div className="flex items-center space-x-3">
                  <span className="material-icons text-telegram-green text-lg">security</span>
                  <p className="tg-caption text-telegram-green">
                    Your credentials are stored securely and encrypted. They are only used to connect to Telegram's official API.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="fluent-btn-primary"
            >
              {saving && <div className="tg-spinner mr-2" />}
              Save Telegram Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AutomationSettings;