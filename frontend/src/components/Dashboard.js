import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = ({ telegramConfig, userProfile, setCurrentPage }) => {
  const navigate = useNavigate();
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

  const handleNavigate = (page, path) => {
    setCurrentPage(page);
    navigate(path); // Use React Router navigate instead of pushState
  };

  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="space-y-8 material-fade-in">
        <div className="material-card-elevated p-6 animate-pulse">
          <div className="h-8 bg-surface-200 rounded-md w-48 mb-2"></div>
          <div className="h-4 bg-surface-100 rounded w-64 mb-6"></div>
          <div className="material-grid material-grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-surface-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 material-fade-in">
      {/* Material Design Header */}
      <div>
        <h1 className="text-headline-medium text-surface-900 font-normal mb-2">
          Dashboard
        </h1>
        <p className="text-body-large text-surface-600">
          Monitor and control your Telegram automation system
        </p>
      </div>

      {/* Main Dashboard Content */}
      <div className="material-grid material-grid-cols-2">
        {/* Quick Actions - Modern Material Design */}
        <div className="material-card-elevated p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <span className="material-icons text-primary-700 text-xl">bolt</span>
            </div>
            <h2 className="text-title-large font-medium text-surface-900">
              Quick Actions
            </h2>
          </div>
          
          <div className="space-y-3">
            {[
              { 
                id: 'messages', 
                icon: 'message', 
                label: 'Manage Messages', 
                description: 'Create and edit templates',
                color: 'blue',
                path: '/messages'
              },
              { 
                id: 'groups', 
                icon: 'groups', 
                label: 'Manage Groups', 
                description: 'Add and manage targets',
                color: 'green',
                path: '/groups'
              },
              { 
                id: 'settings', 
                icon: 'settings', 
                label: 'Automation Settings', 
                description: 'Configure parameters',
                color: 'gray',
                path: '/settings'
              }
            ].map((action) => (
              <button
                key={action.id}
                onClick={() => handleNavigate(action.id, action.path)}
                className="w-full text-left p-4 rounded-xl border border-surface-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    action.color === 'blue' ? 'bg-blue-100 group-hover:bg-blue-200' :
                    action.color === 'green' ? 'bg-green-100 group-hover:bg-green-200' : 
                    'bg-surface-100 group-hover:bg-surface-200'
                  }`}>
                    <span className={`material-icons text-lg ${
                      action.color === 'blue' ? 'text-blue-600' :
                      action.color === 'green' ? 'text-green-600' : 'text-surface-600'
                    }`}>{action.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-title-small font-medium text-surface-900">{action.label}</p>
                    <p className="text-body-small text-surface-600">{action.description}</p>
                  </div>
                  <span className="material-icons text-surface-400 group-hover:text-primary-600 text-lg">chevron_right</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Automation Control - Material Design */}
        <div className="material-card-elevated p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <span className="material-icons text-primary-700 text-xl">smart_toy</span>
            </div>
            <h2 className="text-title-large font-medium text-surface-900">
              Automation Control
            </h2>
          </div>
          
          <div className="space-y-6">
            {/* Current Status */}
            <div className="material-card-outlined border-surface-200 bg-surface-50 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`material-status-${automationConfig?.is_active ? 'online' : 'offline'}`}></div>
                  <span className="text-body-medium font-medium text-surface-700">
                    Status: {automationConfig?.is_active ? 'Running' : 'Stopped'}
                  </span>
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
                  {actionLoading && <div className="material-spinner mr-2" />}
                  <span className="material-icons text-sm mr-2">
                    {automationConfig?.is_active ? 'stop' : 'play_arrow'}
                  </span>
                  {automationConfig?.is_active ? 'Stop' : 'Start'}
                </button>
              </div>
            </div>

            {/* Configuration Summary */}
            {automationConfig && (
              <div className="space-y-4">
                <h3 className="text-title-small font-medium text-surface-700">Current Configuration</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 px-4 bg-surface-50 rounded-lg border border-surface-200">
                    <span className="text-body-medium text-surface-600">Message Delay</span>
                    <span className="text-body-medium font-medium text-surface-900">
                      {automationConfig.message_delay_min}-{automationConfig.message_delay_max}s
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 px-4 bg-surface-50 rounded-lg border border-surface-200">
                    <span className="text-body-medium text-surface-600">Cycle Delay</span>
                    <span className="text-body-medium font-medium text-surface-900">
                      {formatTime(automationConfig.cycle_delay_min)} - {formatTime(automationConfig.cycle_delay_max)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 px-4 bg-success-50 rounded-lg border border-success-200">
                    <span className="text-body-medium text-success-600">Auto Cleanup</span>
                    <span className="text-body-medium font-medium text-success-700">
                      Always Enabled
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Authentication Guide for Unauthenticated Users */}
      {(!telegramConfig?.is_authenticated) && (
        <div className="material-card-elevated border-warning-200 bg-warning-50 p-6">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-warning-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-icons text-white text-lg">warning</span>
            </div>
            <div className="flex-1">
              <h3 className="text-title-medium font-medium text-warning-800 mb-3">
                Complete Telegram Authentication
              </h3>
              <div className="text-body-medium text-warning-700 mb-4">
                <p className="mb-3">
                  To start using the automation system, complete your Telegram authentication:
                </p>
                <ol className="list-decimal ml-4 space-y-1 text-body-small">
                  <li>Navigate to Settings from the sidebar</li>
                  <li>Enter your Telegram API credentials</li>
                  <li>Verify your phone number with SMS code</li>
                  <li>Complete 2FA verification if enabled</li>
                </ol>
              </div>
              <button
                onClick={() => handleNavigate('settings', '/settings')}
                className="material-button-filled bg-warning-600 hover:bg-warning-700 text-white"
              >
                <span className="material-icons mr-2 text-sm">settings</span>
                Open Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;