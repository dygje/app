import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = ({ currentPage, setCurrentPage, telegramConfig, userProfile, onLogout, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (window.innerWidth < 1024 && isOpen) {  
      onClose();
    }
  }, [location.pathname, isOpen, onClose]);

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
    // Close sidebar on mobile after menu click
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      
      {/* App Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <span className="material-icons text-white text-xl">telegram</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              TG Automation
            </h1>
            <p className="text-xs text-gray-500">
              Smart messaging system
            </p>
          </div>
        </div>
      </div>

      {/* User Status */}
      {telegramConfig && (
        <div className="p-4 border-b border-gray-200">
          <div className="card p-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="material-icons text-primary-600">person</span>
              </div>
              <div className="flex-1 min-w-0">
                {userProfile ? (
                  <>
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {userProfile.first_name || 'User'} {userProfile.last_name || ''}
                    </p>
                    {userProfile.username && (
                      <p className="text-xs text-gray-500 truncate">
                        @{userProfile.username}
                      </p>
                    )}
                    <div className="flex items-center space-x-1 mt-1">
                      <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                      <span className="text-xs text-success-600">
                        Connected
                        {userProfile.is_verified && (
                          <span className="material-icons text-xs ml-1 text-blue-500" title="Verified">verified</span>
                        )}
                        {userProfile.is_premium && (
                          <span className="material-icons text-xs ml-1 text-yellow-500" title="Premium">stars</span>
                        )}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {telegramConfig.phone_number || 'Unknown User'}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                      <span className="text-xs text-success-600">Connected</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={isActive ? 'nav-item-active w-full text-left' : 'nav-item w-full text-left'}
            >
              <span className="material-icons text-lg mr-3">
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {/* New Session */}
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to start a new session? This will clear your current authentication.')) {
              onLogout();
            }
          }}
          className="nav-item w-full text-left text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <span className="material-icons text-lg mr-3">refresh</span>
          <span className="text-sm">New Session</span>
        </button>

        {/* Help */}
        <button className="nav-item w-full text-left">
          <span className="material-icons text-lg mr-3">help_outline</span>
          <span className="text-sm">Help & Support</span>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="nav-item w-full text-left text-danger-600 hover:text-danger-700 hover:bg-danger-50"
        >
          <span className="material-icons text-lg mr-3">logout</span>
          <span className="text-sm">Sign Out</span>
        </button>

        {/* Version */}
        <div className="pt-2 mt-2 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            v3.1.0 - Enhanced Edition
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;