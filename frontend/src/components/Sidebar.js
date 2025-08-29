import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = ({ currentPage, setCurrentPage, telegramConfig, userProfile, onLogout, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

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
  };

  return (
    <aside className={`tg-sidebar ${isOpen ? 'open' : 'closed'}`}>
      
      {/* App Header */}
      <div className="p-6 border-b border-telegram-border">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-telegram-blue rounded-2xl flex items-center justify-center shadow-telegram">
            <span className="material-icons text-white text-2xl">telegram</span>
          </div>
          <div>
            <h1 className="tg-heading-3">
              TG Automation
            </h1>
            <p className="tg-caption">
              Smart messaging system
            </p>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      {telegramConfig && (
        <div className="p-6 border-b border-telegram-border">
          <div className="tg-card p-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 bg-telegram-blue bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="material-icons text-telegram-blue text-xl">person</span>
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <div className="tg-status-online border-2 border-telegram-surface"></div>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                {userProfile ? (
                  <>
                    <p className="tg-body font-medium truncate">
                      {userProfile.first_name || 'User'} {userProfile.last_name || ''}
                    </p>
                    {userProfile.username && (
                      <p className="tg-caption truncate text-telegram-blue">
                        @{userProfile.username}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="tg-caption text-telegram-green">
                        Connected
                      </span>
                      {userProfile.is_verified && (
                        <span className="material-icons text-xs text-telegram-blue" title="Verified">verified</span>
                      )}
                      {userProfile.is_premium && (
                        <span className="material-icons text-xs text-telegram-orange" title="Premium">stars</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="tg-body font-medium truncate">
                      {telegramConfig.phone_number || 'Unknown User'}
                    </p>
                    <span className="tg-caption text-telegram-green">Connected</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={`${
                isActive 
                  ? 'tg-nav-item-active' 
                  : 'tg-nav-item'
              } w-full text-left`}
            >
              <span className={`material-icons text-xl ${
                isActive ? 'text-telegram-blue' : 'text-telegram-textMuted'
              }`}>
                {item.icon}
              </span>
              <span className="tg-body font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-telegram-border space-y-2">
        {/* New Session */}
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to start a new session? This will clear your current authentication.')) {
              onLogout();
            }
          }}
          className="tg-nav-item w-full text-left text-telegram-blue hover:text-telegram-blueHover"
        >
          <span className="material-icons text-xl">refresh</span>
          <span className="tg-body font-medium">New Session</span>
        </button>

        {/* Help */}
        <button className="tg-nav-item w-full text-left">
          <span className="material-icons text-xl">help_outline</span>
          <span className="tg-body font-medium">Help & Support</span>
        </button>

        {/* Sign Out */}
        <button
          onClick={onLogout}
          className="tg-nav-item w-full text-left text-telegram-red hover:text-red-400"
        >
          <span className="material-icons text-xl">logout</span>
          <span className="tg-body font-medium">Sign Out</span>
        </button>

        {/* Version */}
        <div className="pt-4 mt-4 border-t border-telegram-border">
          <p className="tg-caption text-center">
            v4.0.0 - Telegram Dark Edition
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;