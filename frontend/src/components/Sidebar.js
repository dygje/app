import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = ({ currentPage, setCurrentPage, telegramConfig, onLogout, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      onClose();
    }
  }, [location.pathname, onClose]);

  const menuItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: 'dashboard',
      path: '/dashboard'
    },
    {
      id: 'messages',
      name: 'Messages',
      icon: 'message',
      path: '/messages'
    },
    {
      id: 'groups',
      name: 'Groups',
      icon: 'groups',
      path: '/groups'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: 'settings',
      path: '/settings'
    }
  ];

  const handleMenuClick = (item) => {
    setCurrentPage(item.id);
    navigate(item.path);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <aside className={`admin-sidebar transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } md:translate-x-0`}>
      
      {/* App Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="material-icons text-white text-lg">telegram</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">
              TG Automation
            </h1>
            <p className="text-xs text-gray-400">
              Smart messaging system
            </p>
          </div>
        </div>
      </div>

      {/* User Status */}
      {telegramConfig && (
        <div className="p-4 border-b border-gray-700">
          <div className="admin-card p-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                <span className="material-icons text-gray-300 text-sm">person</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {telegramConfig.phone_number || 'Unknown User'}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-400">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={isActive ? 'nav-item-active w-full text-left' : 'nav-item w-full text-left'}
            >
              <span className={isActive ? 'nav-icon-active' : 'nav-icon'}>
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-700 space-y-1">
        {/* Help */}
        <button className="nav-item w-full text-left">
          <span className="nav-icon">help_outline</span>
          <span className="text-sm">Help & Support</span>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="nav-item w-full text-left text-red-400 hover:text-red-300 hover:bg-red-900"
        >
          <span className="nav-icon text-red-400">logout</span>
          <span className="text-sm">Sign Out</span>
        </button>

        {/* Version */}
        <div className="pt-2 mt-2 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            v2.1.0 - Dark Edition
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;