import { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = ({ telegramConfig, setCurrentPage }) => {
  const [automationStatus, setAutomationStatus] = useState(null);
  const [automationConfig, setAutomationConfig] = useState(null);
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalGroups: 0,
    messagesActive: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load automation status and config
      const [statusRes, configRes, messagesRes, groupsRes] = await Promise.all([
        axios.get('/automation/status'),
        axios.get('/automation/config'),
        axios.get('/messages'),
        axios.get('/groups')
      ]);

      setAutomationStatus(statusRes.data);
      setAutomationConfig(configRes.data);
      
      // Calculate stats
      const messages = messagesRes.data;
      const groups = groupsRes.data;
      
      setStats({
        totalMessages: messages.length,
        totalGroups: groups.length,
        messagesActive: messages.filter(m => m.is_active).length
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutomation = async () => {
    try {
      setActionLoading(true);
      const endpoint = automationConfig?.is_active ? '/automation/stop' : '/automation/start';
      await axios.post(endpoint);
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to toggle automation:', error);
      alert('Failed to change automation status. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading State with Material Design */}
        <div className="material-fade-in">
          <div className="mb-6">
            <div className="h-8 bg-surface-200 rounded-md w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-surface-100 rounded w-64 animate-pulse"></div>
          </div>
          
          <div className="material-grid material-grid-cols-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="material-card-filled p-6 animate-pulse">
                <div className="h-12 w-12 bg-surface-200 rounded-full mb-4"></div>
                <div className="h-4 bg-surface-200 rounded w-24 mb-2"></div>
                <div className="h-6 bg-surface-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-surface-100 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 material-fade-in">
      {/* Material Design Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-headline-large text-surface-900 font-normal mb-2">
          Welcome Back
        </h1>
        <p className="text-body-large text-surface-600">
          Monitor and manage your Telegram automation system
        </p>
      </div>

      {/* Material Design Stats Grid */}
      <div className="material-grid material-grid-cols-4">
        {/* Total Messages Card */}
        <div className="material-card-interactive p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="material-icons text-primary-700 text-xl">message</span>
            </div>
            <div className="material-badge-info">
              {stats.messagesActive} active
            </div>
          </div>
          <div>
            <h3 className="text-title-large font-medium text-surface-900 mb-1">
              {stats.totalMessages}
            </h3>
            <p className="text-body-medium text-surface-600">Total Messages</p>
          </div>
        </div>

        {/* Total Groups Card */}
        <div className="material-card-interactive p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center">
              <span className="material-icons text-success-700 text-xl">groups</span>
            </div>
            <div className="material-badge-success">
              Active
            </div>
          </div>
          <div>
            <h3 className="text-title-large font-medium text-surface-900 mb-1">
              {stats.totalGroups}
            </h3>
            <p className="text-body-medium text-surface-600">Target Groups</p>
          </div>
        </div>

        {/* Blacklisted Groups Card */}
        <div className="material-card-interactive p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-error-100 rounded-full flex items-center justify-center">
              <span className="material-icons text-error-700 text-xl">block</span>
            </div>
            <div className="material-badge-error">
              Blocked
            </div>
          </div>
          <div>
            <h3 className="text-title-large font-medium text-surface-900 mb-1">
              {stats.blacklistedGroups}
            </h3>
            <p className="text-body-medium text-surface-600">Blacklisted</p>
          </div>
        </div>

        {/* System Status Card */}
        <div className="material-card-interactive p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center">
              <span className="material-icons text-secondary-700 text-xl">
                {automationConfig?.is_active ? 'play_circle' : 'pause_circle'}
              </span>
            </div>
            <div className={`${
              automationConfig?.is_active 
                ? 'material-badge-success' 
                : 'material-badge-warning'
            }`}>
              {automationConfig?.is_active ? 'Running' : 'Stopped'}
            </div>
          </div>
          <div>
            <h3 className="text-title-large font-medium text-surface-900 mb-1">
              {automationConfig?.is_active ? 'Active' : 'Inactive'}
            </h3>
            <p className="text-body-medium text-surface-600">System Status</p>
          </div>
        </div>
      </div>

      {/* Material Design Main Controls Grid */}
      <div className="material-grid material-grid-cols-2 gap-8">
        {/* Automation Control Panel */}
        <div className="material-card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="material-icons text-primary-700 text-lg">smart_toy</span>
              </div>
              <h2 className="text-title-large font-medium text-surface-900">
                Automation Control
              </h2>
            </div>
          </div>
          
          {/* Status Card */}
          <div className="material-card-outlined p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`material-status-${automationConfig?.is_active ? 'online' : 'offline'}`}></div>
                <div>
                  <p className="text-title-small font-medium text-surface-900">
                    Status: {automationConfig?.is_active ? 'Active' : 'Inactive'}
                  </p>
                  <p className="text-body-small text-surface-600">
                    {automationConfig?.is_active 
                      ? 'System is actively sending messages' 
                      : 'System is currently paused'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleToggleAutomation}
                disabled={actionLoading}
                className={`material-button-filled ${
                  automationConfig?.is_active 
                    ? 'bg-error-600 hover:bg-error-700' 
                    : 'bg-success-600 hover:bg-success-700'
                } ${actionLoading ? 'material-loading' : ''}`}
              >
                {actionLoading && <div className="material-spinner mr-2"></div>}
                <span className="material-icons mr-2">
                  {automationConfig?.is_active ? 'stop' : 'play_arrow'}
                </span>
                {automationConfig?.is_active ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>

          {/* Configuration Details */}
          {automationConfig && (
            <div className="space-y-4">
              <h3 className="text-title-small font-medium text-surface-900 mb-3">
                Current Configuration
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                  <span className="text-body-medium text-surface-700">Message Delay</span>
                  <span className="text-body-medium font-medium text-surface-900">
                    {automationConfig.message_delay_min}-{automationConfig.message_delay_max}s
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                  <span className="text-body-medium text-surface-700">Cycle Delay</span>
                  <span className="text-body-medium font-medium text-surface-900">
                    {formatTime(automationConfig.cycle_delay_min)} - {formatTime(automationConfig.cycle_delay_max)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-lg">
                  <span className="text-body-medium text-surface-700">Auto Cleanup</span>
                  <div className={`material-badge-${automationConfig.auto_cleanup_blacklist ? 'success' : 'error'}`}>
                    {automationConfig.auto_cleanup_blacklist ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="material-card-elevated p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center">
              <span className="material-icons text-secondary-700 text-lg">bolt</span>
            </div>
            <h2 className="text-title-large font-medium text-surface-900">
              Quick Actions
            </h2>
          </div>
          
          <div className="material-grid material-grid-cols-2">
            {[
              { id: 'messages', icon: 'message', label: 'Messages', color: 'primary' },
              { id: 'groups', icon: 'groups', label: 'Groups', color: 'success' },
              { id: 'settings', icon: 'settings', label: 'Settings', color: 'secondary' }
            ].map((action) => (
              <button
                key={action.id}
                onClick={() => setCurrentPage(action.id)}
                className="material-card-interactive p-6 text-center group"
              >
                <div className={`w-12 h-12 bg-${action.color}-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                  <span className={`material-icons text-${action.color}-700 text-xl`}>
                    {action.icon}
                  </span>
                </div>
                <p className="text-title-small font-medium text-surface-900">
                  {action.label}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Material Design Connection Status */}
      <div className="material-card-elevated p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center">
            <span className="material-icons text-success-700 text-lg">wifi</span>
          </div>
          <h2 className="text-title-large font-medium text-surface-900">
            Connection Status
          </h2>
        </div>
        
        <div className="material-grid material-grid-cols-2 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="material-icons text-primary-700">telegram</span>
            </div>
            <div>
              <h4 className="text-title-small font-medium text-surface-900">Telegram API</h4>
              <div className="flex items-center space-x-2 mt-1">
                <div className="material-status-online"></div>
                <span className="text-body-medium text-success-600">
                  Connected as {telegramConfig?.phone_number}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
              <span className="material-icons text-success-700">storage</span>
            </div>
            <div>
              <h4 className="text-title-small font-medium text-surface-900">Database</h4>
              <div className="flex items-center space-x-2 mt-1">
                <div className="material-status-online"></div>
                <span className="text-body-medium text-success-600">
                  MongoDB Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Authentication Guide for Unauthenticated Users */}
        {(!telegramConfig?.is_authenticated) && (
          <div className="material-card-outlined border-warning-300 bg-warning-50 p-4">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-warning-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="material-icons text-warning-700 text-lg">warning</span>
              </div>
              <div className="flex-1">
                <h4 className="text-title-small font-medium text-warning-800 mb-2">
                  Complete Telegram Authentication
                </h4>
                <div className="text-body-medium text-warning-700 mb-4">
                  <p className="mb-3">
                    To start using the automation system, complete your Telegram authentication:
                  </p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Navigate to Settings from the sidebar</li>
                    <li>Enter your Telegram API credentials</li>
                    <li>Verify your phone number with SMS code</li>
                    <li>Complete 2FA verification if enabled</li>
                  </ol>
                </div>
                <button
                  onClick={() => setCurrentPage('settings')}
                  className="material-button-filled bg-warning-600 hover:bg-warning-700"
                >
                  <span className="material-icons mr-2">settings</span>
                  Open Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Material Design FAB for Quick Add */}
      <button className="material-fab" title="Quick Add Message">
        <span className="material-icons">add</span>
      </button>
    </div>
  );
};

export default Dashboard;