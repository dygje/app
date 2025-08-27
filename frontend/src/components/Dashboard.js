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
      alert('Gagal mengubah status automation. Silakan coba lagi.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}j ${m}m`;
  };

  if (loading) {
    return (
      <div className="p-6">
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
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Kelola dan monitor sistem automasi Telegram Anda</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 card-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <span className="text-2xl">💬</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pesan</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
              <p className="text-xs text-green-600">{stats.messagesActive} aktif</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 card-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Grup</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalGroups}</p>
              <p className="text-xs text-blue-600">Target aktif</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 card-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <span className="text-2xl">🚫</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Blacklist</p>
              <p className="text-2xl font-bold text-gray-900">{stats.blacklistedGroups}</p>
              <p className="text-xs text-red-600">Grup diblokir</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 card-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-2xl font-bold text-gray-900">
                {automationConfig?.is_active ? 'Aktif' : 'Nonaktif'}
              </p>
              <div className="flex items-center">
                <span className={`status-dot ${automationConfig?.is_active ? 'status-online' : 'status-offline'}`}></span>
                <span className="text-xs text-gray-500">
                  {automationConfig?.is_active ? 'Berjalan' : 'Berhenti'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Automation Control */}
        <div className="bg-white rounded-lg shadow-md p-6 card-shadow">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Kontrol Automasi</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">
                  Status: {automationConfig?.is_active ? 'Aktif' : 'Nonaktif'}
                </p>
                <p className="text-sm text-gray-600">
                  {automationConfig?.is_active 
                    ? 'Sistem sedang mengirim pesan otomatis' 
                    : 'Sistem tidak mengirim pesan'}
                </p>
              </div>
              <button
                onClick={handleToggleAutomation}
                disabled={actionLoading}
                className={`btn ${automationConfig?.is_active ? 'btn-danger' : 'btn-success'} ${actionLoading ? 'loading' : ''}`}
              >
                {actionLoading && <div className="spinner"></div>}
                {automationConfig?.is_active ? 'Hentikan' : 'Mulai'}
              </button>
            </div>

            {automationConfig && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Delay Pesan:</span>
                  <span className="text-sm font-medium">
                    {automationConfig.message_delay_min}-{automationConfig.message_delay_max} detik
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Delay Siklus:</span>
                  <span className="text-sm font-medium">
                    {formatTime(automationConfig.cycle_delay_min)}-{formatTime(automationConfig.cycle_delay_max)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Auto Cleanup:</span>
                  <span className={`badge ${automationConfig.auto_cleanup_blacklist ? 'badge-success' : 'badge-error'}`}>
                    {automationConfig.auto_cleanup_blacklist ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 card-shadow">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCurrentPage('messages')}
              className="btn btn-outline p-4 flex flex-col items-center space-y-2 btn-hover-scale"
            >
              <span className="text-2xl">💬</span>
              <span className="text-sm">Kelola Pesan</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('groups')}
              className="btn btn-outline p-4 flex flex-col items-center space-y-2 btn-hover-scale"
            >
              <span className="text-2xl">👥</span>
              <span className="text-sm">Kelola Grup</span>
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
              <span className="text-sm">Pengaturan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow-md p-6 card-shadow">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Status Koneksi</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Telegram</h4>
            <div className="flex items-center space-x-2">
              <span className="status-dot status-online"></span>
              <span className="text-sm text-gray-600">
                Terhubung sebagai {telegramConfig?.phone_number}
              </span>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Database</h4>
            <div className="flex items-center space-x-2">
              <span className="status-dot status-online"></span>
              <span className="text-sm text-gray-600">MongoDB aktif</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;