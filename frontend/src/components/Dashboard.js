import { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = ({ telegramConfig, userProfile, setCurrentPage }) => {
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
        <div className="fade-in">
          <div className="card">
            <div className="card-body">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
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
      {/* Welcome Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Welcome Back{userProfile ? `, ${userProfile.first_name || 'User'}` : ''}
        </h2>
        <p className="text-gray-600">
          {userProfile ? (
            `Monitor and manage your Telegram automation system${userProfile.username ? ` (@${userProfile.username})` : ''}`
          ) : (
            'Monitor and manage your Telegram automation system'
          )}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Messages Stats */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
                <p className="text-sm text-success-600 mt-1">
                  {stats.messagesActive} active
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <span className="material-icons text-primary-600">message</span>
              </div>
            </div>
          </div>
        </div>

        {/* Groups Stats */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Target Groups</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalGroups}</p>
                <p className="text-sm text-success-600 mt-1">
                  All active
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

      {/* Main Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Automation Control */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <span className="material-icons text-primary-600 text-lg">smart_toy</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Automation Control
              </h3>
            </div>
          </div>
          
          <div className="card-body space-y-4">
            {/* Status Display */}
            <div className="card border border-gray-200">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      automationConfig?.is_active ? 'bg-success-500' : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Status: {automationConfig?.is_active ? 'Active' : 'Inactive'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {automationConfig?.is_active 
                          ? 'System is sending messages' 
                          : 'System is paused'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleToggleAutomation}
                    disabled={actionLoading}
                    className={`${
                      automationConfig?.is_active 
                        ? 'btn-danger' 
                        : 'btn-primary'
                    } ${actionLoading ? 'opacity-50' : ''}`}
                  >
                    {actionLoading && <div className="loading-spinner mr-2"></div>}
                    <span className="material-icons mr-2 text-sm">
                      {automationConfig?.is_active ? 'stop' : 'play_arrow'}
                    </span>
                    {automationConfig?.is_active ? 'Stop' : 'Start'}
                  </button>
                </div>
              </div>
            </div>

            {/* Configuration Details */}
            {automationConfig && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Current Configuration
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Message Delay</span>
                    <span className="text-sm font-medium text-gray-900">
                      {automationConfig.message_delay_min}-{automationConfig.message_delay_max}s
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Cycle Delay</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatTime(automationConfig.cycle_delay_min)} - {formatTime(automationConfig.cycle_delay_max)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Auto Cleanup</span>
                    <span className="status-online">
                      Enabled
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="material-icons text-gray-600 text-lg">bolt</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Quick Actions
              </h3>
            </div>
          </div>
          
          <div className="card-body">
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'messages', icon: 'message', label: 'Manage Messages', color: 'primary' },
                { id: 'groups', icon: 'groups', label: 'Manage Groups', color: 'success' },
                { id: 'settings', icon: 'settings', label: 'System Settings', color: 'gray' }
              ].map((action) => (
                <button
                  key={action.id}
                  onClick={() => setCurrentPage(action.id)}
                  className="btn-outline text-left p-4 rounded-lg hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      action.color === 'primary' ? 'bg-primary-100' :
                      action.color === 'success' ? 'bg-success-100' : 'bg-gray-100'
                    }`}>
                      <span className={`material-icons ${
                        action.color === 'primary' ? 'text-primary-600' :
                        action.color === 'success' ? 'text-success-600' : 'text-gray-600'
                      }`}>{action.icon}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{action.label}</p>
                      <p className="text-sm text-gray-500">
                        {action.id === 'messages' && 'Create and manage templates'}
                        {action.id === 'groups' && 'Add target groups'}
                        {action.id === 'settings' && 'Configure automation'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
              <span className="material-icons text-success-600 text-lg">wifi</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Connection Status
            </h3>
          </div>
        </div>
        
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <span className="material-icons text-primary-600">telegram</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700">Telegram API</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                  <span className="text-sm text-success-600">
                    Connected as {telegramConfig?.phone_number}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                <span className="material-icons text-success-600">storage</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700">Database</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                  <span className="text-sm text-success-600">
                    MongoDB Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Authentication Guide for Unauthenticated Users */}
          {(!telegramConfig?.is_authenticated) && (
            <div className="mt-6 card border border-warning-200 bg-warning-50">
              <div className="p-4">
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
                      onClick={() => setCurrentPage('settings')}
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
      </div>
    </div>
  );
};

export default Dashboard;