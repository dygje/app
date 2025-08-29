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
    navigate(path);
  };

  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="space-y-8 tg-fade-in">
        <div className="tg-card-elevated p-6 animate-pulse">
          <div className="h-8 bg-telegram-elevated rounded-md w-48 mb-2"></div>
          <div className="h-4 bg-telegram-border rounded w-64 mb-6"></div>
          <div className="tg-grid tg-grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-telegram-elevated rounded-telegram"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 tg-fade-in">
      {/* Header */}
      <div>
        <h1 className="tg-heading-1 mb-2">
          Dashboard
        </h1>
        <p className="tg-body-secondary">
          Monitor and control your Telegram automation system
        </p>
      </div>

      {/* Stats Overview */}
      <div className="tg-grid tg-grid-cols-3">
        <div className="tg-card p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-telegram-blue bg-opacity-20 rounded-telegram flex items-center justify-center">
              <span className="material-icons text-telegram-blue text-lg">groups</span>
            </div>
            <div>
              <p className="tg-caption text-telegram-textMuted">Total Groups</p>
              <p className="tg-heading-2 text-telegram-text">{stats.totalGroups}</p>
            </div>
          </div>
        </div>

        <div className="tg-card p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-telegram-green bg-opacity-20 rounded-telegram flex items-center justify-center">
              <span className="material-icons text-telegram-green text-lg">message</span>
            </div>
            <div>
              <p className="tg-caption text-telegram-textMuted">Active Templates</p>
              <p className="tg-heading-2 text-telegram-text">{stats.messagesActive}/{stats.totalMessages}</p>
            </div>
          </div>
        </div>

        <div className="tg-card p-6">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-telegram flex items-center justify-center ${
              automationConfig?.is_active 
                ? 'bg-telegram-green bg-opacity-20' 
                : 'bg-telegram-textMuted bg-opacity-20'
            }`}>
              <span className={`material-icons text-lg ${
                automationConfig?.is_active ? 'text-telegram-green' : 'text-telegram-textMuted'
              }`}>
                smart_toy
              </span>
            </div>
            <div>
              <p className="tg-caption text-telegram-textMuted">System Status</p>
              <p className="tg-heading-3">{automationConfig?.is_active ? 'Running' : 'Stopped'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="tg-grid tg-grid-cols-2">
        {/* Quick Actions */}
        <div className="tg-card-elevated p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-telegram-blue bg-opacity-20 rounded-telegram flex items-center justify-center">
              <span className="material-icons text-telegram-blue text-xl">bolt</span>
            </div>
            <h2 className="tg-heading-2">
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
                className="tg-card-interactive w-full text-left p-4 group"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-telegram flex items-center justify-center transition-colors ${
                    action.color === 'blue' ? 'bg-telegram-blue bg-opacity-20 group-hover:bg-opacity-30' :
                    action.color === 'green' ? 'bg-telegram-green bg-opacity-20 group-hover:bg-opacity-30' : 
                    'bg-telegram-textMuted bg-opacity-20 group-hover:bg-opacity-30'
                  }`}>
                    <span className={`material-icons text-lg ${
                      action.color === 'blue' ? 'text-telegram-blue' :
                      action.color === 'green' ? 'text-telegram-green' : 'text-telegram-textMuted'
                    }`}>{action.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="tg-body font-medium">{action.label}</p>
                    <p className="tg-caption">{action.description}</p>
                  </div>
                  <span className="material-icons text-telegram-textMuted group-hover:text-telegram-blue text-lg">chevron_right</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Automation Control */}
        <div className="tg-card-elevated p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-telegram-blue bg-opacity-20 rounded-telegram flex items-center justify-center">
              <span className="material-icons text-telegram-blue text-xl">smart_toy</span>
            </div>
            <h2 className="tg-heading-2">
              Automation Control
            </h2>
          </div>
          
          <div className="space-y-6">
            {/* Current Status */}
            <div className="tg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={automationConfig?.is_active ? 'tg-status-online' : 'tg-status-offline'}></div>
                  <span className="tg-body font-medium">
                    Status: {automationConfig?.is_active ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <button
                  onClick={handleToggleAutomation}
                  disabled={actionLoading}
                  className={`${
                    automationConfig?.is_active 
                      ? 'fluent-btn-danger' 
                      : 'fluent-btn-success'
                  } ${actionLoading ? 'opacity-50' : ''}`}
                >
                  {actionLoading && <div className="tg-spinner mr-2" />}
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
                <h3 className="tg-heading-3">Current Configuration</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 px-4 tg-card">
                    <span className="tg-body-secondary">Message Delay</span>
                    <span className="tg-body font-medium">
                      {automationConfig.message_delay_min}-{automationConfig.message_delay_max}s
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 px-4 tg-card">
                    <span className="tg-body-secondary">Cycle Delay</span>
                    <span className="tg-body font-medium">
                      {formatTime(automationConfig.cycle_delay_min)} - {formatTime(automationConfig.cycle_delay_max)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 px-4 tg-card border-telegram-green border-opacity-30 bg-telegram-green bg-opacity-10">
                    <span className="tg-body-secondary text-telegram-green">Auto Cleanup</span>
                    <span className="tg-body font-medium text-telegram-green">
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
        <div className="tg-card-elevated border-telegram-orange border-opacity-30 bg-telegram-orange bg-opacity-10 p-6">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-telegram-orange rounded-telegram flex items-center justify-center flex-shrink-0">
              <span className="material-icons text-white text-lg">warning</span>
            </div>
            <div className="flex-1">
              <h3 className="tg-heading-3 text-telegram-orange mb-3">
                Complete Telegram Authentication
              </h3>
              <div className="tg-body-secondary text-telegram-orange mb-4">
                <p className="mb-3">
                  To start using the automation system, complete your Telegram authentication:
                </p>
                <ol className="list-decimal ml-4 space-y-1 tg-caption">
                  <li>Navigate to Settings from the sidebar</li>
                  <li>Enter your Telegram API credentials</li>
                  <li>Verify your phone number with SMS code</li>
                  <li>Complete 2FA verification if enabled</li>
                </ol>
              </div>
              <button
                onClick={() => handleNavigate('settings', '/settings')}
                className="fluent-btn-primary bg-telegram-orange hover:bg-orange-600"
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