import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = ({ currentPage, setCurrentPage, telegramConfig, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: '📊',
      path: '/dashboard'
    },
    {
      id: 'messages',
      name: 'Kelola Pesan',
      icon: '💬',
      path: '/messages'
    },
    {
      id: 'groups',
      name: 'Kelola Grup',
      icon: '👥',
      path: '/groups'
    },
    {
      id: 'blacklist',
      name: 'Blacklist',
      icon: '🚫',
      path: '/blacklist'
    },
    {
      id: 'settings',
      name: 'Pengaturan',
      icon: '⚙️',
      path: '/settings'
    }
  ];

  const handleMenuClick = (item) => {
    setCurrentPage(item.id);
    navigate(item.path);
  };

  return (
    <aside className={`bg-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'} min-h-screen flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-gray-800">Telegram Auto</h1>
              <p className="text-sm text-gray-500">Automation System</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && telegramConfig && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {telegramConfig.phone_number ? telegramConfig.phone_number.slice(-2) : 'TG'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {telegramConfig.phone_number || 'Unknown'}
              </p>
              <div className="flex items-center">
                <span className="status-dot status-online"></span>
                <span className="text-xs text-gray-500">Terhubung</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleMenuClick(item)}
                  className={`sidebar-item w-full text-left p-3 flex items-center space-x-3 ${isActive ? 'active' : ''}`}
                  title={isCollapsed ? item.name : ''}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="font-medium">{item.name}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        {!isCollapsed && (
          <div className="space-y-2">
            <button
              onClick={onLogout}
              className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium flex items-center justify-center space-x-2"
            >
              <span>🚪</span>
              <span>Keluar</span>
            </button>
            <div className="text-xs text-gray-400 text-center">
              v1.0.0 - Telegram Automation
            </div>
          </div>
        )}
        {isCollapsed && (
          <button
            onClick={onLogout}
            className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex justify-center"
            title="Keluar"
          >
            🚪
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;