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
      <div className="space-y-6">
        <div className="fade-in">
          <div className="card">
            <div className="card-body">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Groups Stats */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Target Groups</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalGroups}</p>
                <p className="text-sm text-success-600 mt-1">
                  Ready for automation
                </p>
              </div>
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                <span className="material-icons text-success-600">groups</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">System Status</p>
                <p className="text-2xl font-bold text-gray-900">
                  {automationConfig?.is_active ? 'Running' : 'Stopped'}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    automationConfig?.is_active ? 'bg-success-500' : 'bg-gray-400'
                  }`}></div>
                  <span className={`text-sm ${
                    automationConfig?.is_active ? 'text-success-600' : 'text-gray-500'
                  }`}>
                    {automationConfig?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                automationConfig?.is_active ? 'bg-success-100' : 'bg-gray-100'
              }`}>
                <span className={`material-icons ${
                  automationConfig?.is_active ? 'text-success-600' : 'text-gray-500'
                }`}>
                  {automationConfig?.is_active ? 'play_circle' : 'pause_circle'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions - Compact Design */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="material-icons text-blue-600 text-lg">bolt</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Quick Actions
              </h3>
            </div>
          </div>
          
          <div className="card-body">
            <div className="space-y-2">
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
                  className="btn-action group"
                >
                  <div className="btn-action-content">
                    <div className={`btn-action-icon ${
                      action.color === 'blue' ? 'bg-blue-100 group-hover:bg-blue-200' :
                      action.color === 'green' ? 'bg-green-100 group-hover:bg-green-200' : 
                      'bg-gray-100 group-hover:bg-gray-200'
                    }`}>
                      <span className={`material-icons text-sm ${
                        action.color === 'blue' ? 'text-blue-600' :
                        action.color === 'green' ? 'text-green-600' : 'text-gray-600'
                      }`}>{action.icon}</span>
                    </div>
                    <div className="btn-action-text">
                      <p className="btn-action-label">{action.label}</p>
                      <p className="btn-action-description">{action.description}</p>
                    </div>
                    <span className="material-icons text-gray-400 group-hover:text-blue-600 text-lg">chevron_right</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Automation Control */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="material-icons text-blue-600 text-lg">smart_toy</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Automation Control
              </h3>
            </div>
          </div>
          
          <div className="card-body space-y-4">
            {/* Current Status */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    automationConfig?.is_active ? 'bg-success-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    Status: {automationConfig?.is_active ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <button
                  onClick={handleToggleAutomation}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    automationConfig?.is_active 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {actionLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="material-icons text-sm">
                        {automationConfig?.is_active ? 'stop' : 'play_arrow'}
                      </span>
                      <span>{automationConfig?.is_active ? 'Stop' : 'Start'}</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Configuration Summary */}
            {automationConfig && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Current Configuration</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Message Delay</span>
                    <span className="text-sm font-medium text-gray-900">
                      {automationConfig.message_delay_min}-{automationConfig.message_delay_max}s
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Cycle Delay</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatTime(automationConfig.cycle_delay_min)} - {formatTime(automationConfig.cycle_delay_max)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Auto Cleanup</span>
                    <span className="text-sm font-medium text-success-600">
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
        <div className="card border border-warning-200 bg-warning-50">
          <div className="card-body">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-warning-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="material-icons text-white text-lg">warning</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-warning-800 mb-2">
                  Complete Telegram Authentication
                </h4>
                <div className="text-sm text-warning-700 mb-4">
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
                  onClick={() => handleNavigate('settings', '/settings')}
                  className="btn-primary"
                >
                  <span className="material-icons mr-2 text-sm">settings</span>
                  Open Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;