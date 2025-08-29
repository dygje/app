import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = ({ currentPage, setCurrentPage, telegramConfig, userProfile, onLogout, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Only close sidebar on mobile when explicitly requested
  // Removed auto-close on route change to prevent sidebar closing when clicking menu items

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
    // Only close sidebar on mobile when user explicitly wants it
    // Removed automatic close to prevent sidebar closing immediately after click
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      
      {/* App Header - Material Design */}
      <div className="p-6 border-b border-surface-200">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center">
            <span className="material-icons text-white text-xl">telegram</span>
          </div>
          <div>
            <h1 className="text-title-large font-medium text-surface-900">
              TG Automation
            </h1>
            <p className="text-body-small text-surface-600">
              Smart messaging system
            </p>
          </div>
        </div>
      </div>

      {/* User Status - Material Design */}
      {telegramConfig && (
        <div className="p-6 border-b border-surface-200">
          <div className="material-card-outlined p-4 rounded-xl bg-surface-50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="material-icons text-primary-700">person</span>
              </div>
              <div className="flex-1 min-w-0">
                {userProfile ? (
                  <>
                    <p className="text-body-medium font-medium text-surface-900 truncate">
                      {userProfile.first_name || 'User'} {userProfile.last_name || ''}
                    </p>
                    {userProfile.username && (
                      <p className="text-body-small text-surface-600 truncate">
                        @{userProfile.username}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="material-status-online"></div>
                      <span className="text-body-small text-success-700 font-medium">
                        Connected
                        {userProfile.is_verified && (
                          <span className="material-icons text-sm ml-1 text-primary-600" title="Verified">verified</span>
                        )}
                        {userProfile.is_premium && (
                          <span className="material-icons text-sm ml-1 text-warning-600" title="Premium">stars</span>
                        )}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-body-medium font-medium text-surface-900 truncate">
                      {telegramConfig.phone_number || 'Unknown User'}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="material-status-online"></div>
                      <span className="text-body-small text-success-700 font-medium">Connected</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu - Material Design */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                isActive 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-surface-700 hover:bg-surface-100 hover:text-surface-900'
              }`}
            >
              <span className={`material-icons text-xl ${
                isActive ? 'text-primary-700' : 'text-surface-600'
              }`}>
                {item.icon}
              </span>
              <span className="text-body-medium font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Actions - Material Design */}
      <div className="p-4 border-t border-surface-200 space-y-2">
        {/* New Session */}
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to start a new session? This will clear your current authentication.')) {
              onLogout();
            }
          }}
          className="w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-left text-primary-700 hover:text-primary-800 hover:bg-primary-50 transition-all duration-200"
        >
          <span className="material-icons text-xl">refresh</span>
          <span className="text-body-medium font-medium">New Session</span>
        </button>

        {/* Help */}
        <button className="w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-left text-surface-700 hover:text-surface-900 hover:bg-surface-100 transition-all duration-200">
          <span className="material-icons text-xl">help_outline</span>
          <span className="text-body-medium font-medium">Help & Support</span>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-left text-error-700 hover:text-error-800 hover:bg-error-50 transition-all duration-200"
        >
          <span className="material-icons text-xl">logout</span>
          <span className="text-body-medium font-medium">Sign Out</span>
        </button>

        {/* Version */}
        <div className="pt-4 mt-4 border-t border-surface-200">
          <p className="text-body-small text-surface-400 text-center">
            v3.2.0 - Enhanced Edition
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;