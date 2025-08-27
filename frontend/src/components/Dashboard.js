import { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = ({ telegramConfig, setCurrentPage }) => {
  const [automationStatus, setAutomationStatus] = useState(null);
  const [automationConfig, setAutomationConfig] = useState(null);
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalGroups: 0,
    blacklistedGroups: 0,
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
      const [statusRes, configRes, messagesRes, groupsRes, blacklistRes] = await Promise.all([
        axios.get('/automation/status'),
        axios.get('/automation/config'),
        axios.get('/messages'),
        axios.get('/groups'),
        axios.get('/blacklist')
      ]);

      setAutomationStatus(statusRes.data);
      setAutomationConfig(configRes.data);
      
      // Calculate stats
      const messages = messagesRes.data;
      const groups = groupsRes.data;
      const blacklist = blacklistRes.data;
      
      setStats({
        totalMessages: messages.length,
        totalGroups: groups.length,
        blacklistedGroups: blacklist.length,
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
      <div className="p-4 md:p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Manage and monitor your Telegram automation system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 card-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <span className="text-xl md:text-2xl">💬</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
              <p className="text-xs text-green-600">{stats.messagesActive} active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 card-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-xl md:text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Groups</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalGroups}</p>
              <p className="text-xs text-blue-600">Active targets</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 card-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <span className="text-xl md:text-2xl">🚫</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Blacklisted</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.blacklistedGroups}</p>
              <p className="text-xs text-red-600">Blocked groups</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 card-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <span className="text-xl md:text-2xl">⚡</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">
                {automationConfig?.is_active ? 'Active' : 'Inactive'}
              </p>
              <div className="flex items-center">
                <span className={`status-dot ${automationConfig?.is_active ? 'status-online' : 'status-offline'}`}></span>
                <span className="text-xs text-gray-500 ml-1">
                  {automationConfig?.is_active ? 'Running' : 'Stopped'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
        {/* Automation Control */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 card-shadow">
          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Automation Control</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">
                  Status: {automationConfig?.is_active ? 'Active' : 'Inactive'}
                </p>
                <p className="text-sm text-gray-600">
                  {automationConfig?.is_active 
                    ? 'System is sending automated messages' 
                    : 'System is not sending messages'}
                </p>
              </div>
              <button
                onClick={handleToggleAutomation}
                disabled={actionLoading}
                className={`btn ${automationConfig?.is_active ? 'btn-danger' : 'btn-success'} ${actionLoading ? 'loading' : ''}`}
              >
                {actionLoading && <div className="spinner"></div>}
                {automationConfig?.is_active ? 'Stop' : 'Start'}
              </button>
            </div>

            {automationConfig && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Message Delay:</span>
                  <span className="text-sm font-medium">
                    {automationConfig.message_delay_min}-{automationConfig.message_delay_max} seconds
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cycle Delay:</span>
                  <span className="text-sm font-medium">
                    {formatTime(automationConfig.cycle_delay_min)}-{formatTime(automationConfig.cycle_delay_max)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Auto Cleanup:</span>
                  <span className={`badge ${automationConfig.auto_cleanup_blacklist ? 'badge-success' : 'badge-error'}`}>
                    {automationConfig.auto_cleanup_blacklist ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 card-shadow">
          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCurrentPage('messages')}
              className="btn btn-outline p-4 flex flex-col items-center space-y-2 btn-hover-scale"
            >
              <span className="text-2xl">💬</span>
              <span className="text-sm">Messages</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('groups')}
              className="btn btn-outline p-4 flex flex-col items-center space-y-2 btn-hover-scale"
            >
              <span className="text-2xl">👥</span>
              <span className="text-sm">Groups</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('blacklist')}
              className="btn btn-outline p-4 flex flex-col items-center space-y-2 btn-hover-scale"
            >
              <span className="text-2xl">🚫</span>
              <span className="text-sm">Blacklist</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('settings')}
              className="btn btn-outline p-4 flex flex-col items-center space-y-2 btn-hover-scale"
            >
              <span className="text-2xl">⚙️</span>
              <span className="text-sm">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status & Authentication Guide */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 card-shadow">
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Connection Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Telegram</h4>
            <div className="flex items-center space-x-2">
              <span className="status-dot status-online"></span>
              <span className="text-sm text-gray-600">
                Connected as {telegramConfig?.phone_number}
              </span>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Database</h4>
            <div className="flex items-center space-x-2">
              <span className="status-dot status-online"></span>
              <span className="text-sm text-gray-600">MongoDB active</span>
            </div>
          </div>
        </div>

        {/* Authentication Guide */}
        {(!telegramConfig?.is_authenticated) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-600 text-xl">⚠️</span>
              </div>
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                  Telegram Authentication Required
                </h4>
                <div className="text-sm text-yellow-700 mb-4">
                  <p className="mb-2">
                    To use the automation system, you need to authenticate with Telegram first:
                  </p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Click "Settings" in the sidebar</li>
                    <li>Enter your API ID, API Hash, and Phone Number</li>
                    <li>Follow the SMS and 2FA verification process (if required)</li>
                    <li>After successful authentication, return to Dashboard to start automation</li>
                  </ol>
                </div>
                <button
                  onClick={() => setCurrentPage('settings')}
                  className="btn btn-sm btn-primary"
                >
                  🔧 Open Telegram Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;