import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = ({ currentPage, setCurrentPage, telegramConfig, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && !event.target.closest('aside') && !event.target.closest('[data-mobile-menu-button]')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const menuItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: '📊',
      path: '/dashboard'
    },
    {
      id: 'messages',
      name: 'Messages',
      icon: '💬',
      path: '/messages'
    },
    {
      id: 'groups',
      name: 'Groups',
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
      name: 'Settings',
      icon: '⚙️',
      path: '/settings'
    }
  ];

  const handleMenuClick = (item) => {
    setCurrentPage(item.id);
    navigate(item.path);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        data-mobile-menu-button
        className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md rounded-lg p-3 border border-gray-200 btn"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? (
          <span className="text-xl">✕</span>
        ) : (
          <span className="text-xl">☰</span>
        )}
      </button>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 modal-backdrop" />
      )}

      {/* Sidebar */}
      <aside className={`
        bg-white shadow-lg transition-all duration-300 min-h-screen flex flex-col z-40
        ${isCollapsed && !isMobileMenuOpen ? 'w-16' : 'w-64'}
        md:relative md:translate-x-0
        ${isMobileMenuOpen 
          ? 'fixed left-0 top-0 translate-x-0' 
          : 'fixed left-0 top-0 -translate-x-full md:translate-x-0'
        }
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-800">Automation</h1>
                  <p className="text-xs text-gray-500">Telegram Bot</p>
                </div>
              </div>
            )}
            {isCollapsed && (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:block p-2 rounded-lg hover:bg-gray-100 transition-colors btn-sm"
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
                <div className="flex items-center space-x-1">
                  <span className="status-dot status-online"></span>
                  <span className="text-xs text-gray-500 ml-1">Terhubung</span>
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
                    className={`
                      w-full text-left p-3 flex items-center space-x-3 rounded-lg transition-colors font-medium
                      ${isActive 
                        ? 'bg-blue-100 text-blue-900 border-l-4 border-blue-600' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                      btn
                    `}
                    title={isCollapsed ? item.name : ''}
                  >
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
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
            <div className="space-y-3">
              <button
                onClick={onLogout}
                className="w-full p-3 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 btn"
              >
                <span>🚪</span>
                <span>Keluar</span>
              </button>
              <div className="text-xs text-gray-400 text-center">
                v2.0.0 - Telegram Automation
              </div>
            </div>
          )}
          {isCollapsed && (
            <button
              onClick={onLogout}
              className="w-full p-3 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors flex justify-center btn"
              title="Keluar"
            >
              🚪
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;