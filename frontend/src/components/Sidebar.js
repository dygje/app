import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = ({ currentPage, setCurrentPage, telegramConfig, onLogout, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
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
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Material Design Navigation Drawer */}
      <aside className={`
        material-nav-drawer fixed inset-y-0 left-0 z-40 w-80 flex flex-col
        transform transition-transform duration-300 lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Material Design App Identity */}
        <div className="px-6 py-6 border-b border-surface-200">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center elevation-2">
              <span className="material-icons text-white text-2xl">telegram</span>
            </div>
            <div>
              <h1 className="text-title-large font-medium text-surface-900">
                Telegram Automation
              </h1>
              <p className="text-body-small text-surface-600">
                Smart messaging system
              </p>
            </div>
          </div>
        </div>

        {/* Material Design User Profile Card */}
        {telegramConfig && (
          <div className="px-6 py-4 border-b border-surface-200">
            <div className="material-card-filled p-4 rounded-xl">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center">
                  <span className="material-icons text-secondary-700">person</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-title-small text-surface-900 truncate font-medium">
                    {telegramConfig.phone_number || 'Unknown User'}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="material-status-online"></div>
                    <span className="text-body-small text-success-600">Connected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Material Design Navigation Menu */}
        <nav className="flex-1 px-6 py-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item)}
                  className={`
                    material-nav-item w-full text-left
                    ${isActive 
                      ? 'material-nav-item-active' 
                      : 'hover:bg-surface-50'
                    }
                  `}
                >
                  <span className="material-icons text-xl mr-4">{item.icon}</span>
                  <span className="text-body-large">{item.name}</span>
                  
                  {/* Material Design Active Indicator */}
                  {isActive && (
                    <div className="ml-auto w-1 h-6 bg-secondary-600 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Material Design Divider */}
        <div className="mx-6 border-t border-surface-200"></div>

        {/* Material Design Quick Stats */}
        <div className="px-6 py-4 space-y-3">
          <h3 className="text-label-large text-surface-900 font-medium">Quick Status</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-body-small text-surface-600">System Status</span>
              <div className="material-badge-success">
                Active
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-body-small text-surface-600">Database</span>
              <div className="flex items-center space-x-1">
                <div className="material-status-online w-1.5 h-1.5"></div>
                <span className="text-body-small text-success-600">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Material Design Footer Actions */}
        <div className="px-6 py-4 border-t border-surface-200 space-y-3">
          {/* Help & Support */}
          <button className="material-nav-item w-full text-left">
            <span className="material-icons text-xl mr-4">help_outline</span>
            <span className="text-body-large">Help & Support</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="material-nav-item w-full text-left text-error-600 hover:bg-error-50"
          >
            <span className="material-icons text-xl mr-4">logout</span>
            <span className="text-body-large">Sign Out</span>
          </button>

          {/* Version Info */}
          <div className="pt-2 border-t border-surface-200">
            <p className="text-body-small text-surface-500 text-center">
              Version 2.0.0 - Material Design
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;