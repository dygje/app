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
        <div className="fade-in">
          <div className="admin-card">
            <div className="admin-card-content">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-700 rounded w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-700 rounded"></div>
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
        <h2 className="text-2xl font-semibold text-gray-100 mb-2">
          Welcome Back
        </h2>
        <p className="text-gray-400">
          Monitor and manage your Telegram automation system
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Messages Stats */}
        <div className="admin-card">
          <div className="admin-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">Total Messages</p>
                <p className="text-2xl font-bold text-gray-100">{stats.totalMessages}</p>
                <p className="text-sm text-green-400 mt-1">
                  {stats.messagesActive} active
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="material-icons text-white">message</span>
              </div>
            </div>
          </div>
        </div>

        {/* Groups Stats */}
        <div className="admin-card">
          <div className="admin-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">Target Groups</p>
                <p className="text-2xl font-bold text-gray-100">{stats.totalGroups}</p>
                <p className="text-sm text-green-400 mt-1">
                  All active
                </p>
              </div>
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="material-icons text-white">groups</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="admin-card">
          <div className="admin-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">System Status</p>
                <p className="text-2xl font-bold text-gray-100">
                  {automationConfig?.is_active ? 'Running' : 'Stopped'}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    automationConfig?.is_active ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className={`text-sm ${
                    automationConfig?.is_active ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {automationConfig?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                automationConfig?.is_active ? 'bg-green-600' : 'bg-gray-600'
              }`}>
                <span className="material-icons text-white">
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
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="material-icons text-white text-lg">smart_toy</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-100">
                Automation Control
              </h3>
            </div>
          </div>
          
          <div className="admin-card-content space-y-4">
            {/* Status Display */}
            <div className="admin-card bg-gray-700">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      automationConfig?.is_active ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-200">
                        Status: {automationConfig?.is_active ? 'Active' : 'Inactive'}
                      </p>
                      <p className="text-xs text-gray-400">
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
                <h4 className="text-sm font-medium text-gray-300 mb-3">
                  Current Configuration
                </h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded">
                    <span className="text-sm text-gray-300">Message Delay</span>
                    <span className="text-sm font-medium text-gray-200">
                      {automationConfig.message_delay_min}-{automationConfig.message_delay_max}s
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded">
                    <span className="text-sm text-gray-300">Cycle Delay</span>
                    <span className="text-sm font-medium text-gray-200">
                      {formatTime(automationConfig.cycle_delay_min)} - {formatTime(automationConfig.cycle_delay_max)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded">
                    <span className="text-sm text-gray-300">Auto Cleanup</span>
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
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                <span className="material-icons text-white text-lg">bolt</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-100">
                Quick Actions
              </h3>
            </div>
          </div>
          
          <div className="admin-card-content">
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'messages', icon: 'message', label: 'Manage Messages', color: 'blue' },
                { id: 'groups', icon: 'groups', label: 'Manage Groups', color: 'green' },
                { id: 'settings', icon: 'settings', label: 'System Settings', color: 'gray' }
              ].map((action) => (
                <button
                  key={action.id}
                  onClick={() => setCurrentPage(action.id)}
                  className="btn-ghost text-left p-4 rounded-lg border border-gray-600 hover:border-gray-500 hover:bg-gray-700 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 bg-${action.color}-600 rounded-lg flex items-center justify-center`}>
                      <span className="material-icons text-white">{action.icon}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-200">{action.label}</p>
                      <p className="text-sm text-gray-400">
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
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="material-icons text-white text-lg">wifi</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-100">
              Connection Status
            </h3>
          </div>
        </div>
        
        <div className="admin-card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="material-icons text-white">telegram</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-200">Telegram API</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-400">
                    Connected as {telegramConfig?.phone_number}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="material-icons text-white">storage</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-200">Database</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-400">
                    MongoDB Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Authentication Guide for Unauthenticated Users */}
          {(!telegramConfig?.is_authenticated) && (
            <div className="mt-6 admin-card border-yellow-600 bg-yellow-900">
              <div className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="material-icons text-white text-lg">warning</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-yellow-200 mb-2">
                      Complete Telegram Authentication
                    </h4>
                    <div className="text-sm text-yellow-300 mb-4">
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