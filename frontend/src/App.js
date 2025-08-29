import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Dashboard from "./components/Dashboard";
import TelegramSetup from "./components/TelegramSetup";
import MessageManager from "./components/MessageManager";
import GroupManager from "./components/GroupManager";
import AutomationSettings from "./components/AutomationSettings";
import Sidebar from "./components/Sidebar";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Global axios configuration
axios.defaults.baseURL = API;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [telegramConfig, setTelegramConfig] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check Telegram authentication status on app load
  const checkTelegramStatus = async () => {
    try {
      const response = await axios.get('/telegram/status');
      setIsAuthenticated(response.data.authenticated);
      
      if (response.data.authenticated) {
        const configResponse = await axios.get('/telegram/config');
        setTelegramConfig(configResponse.data);
        
        // Set user profile from status response
        if (response.data.user_profile) {
          setUserProfile(response.data.user_profile);
        }
      }
    } catch (error) {
      console.error('Failed to check Telegram status:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTelegramStatus();
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    checkTelegramStatus();
  };

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint
      await axios.post('/telegram/logout');
      
      // Reset local state
      setIsAuthenticated(false);
      setTelegramConfig(null);
      setUserProfile(null);
      setCurrentPage('dashboard');
      console.log('Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if backend fails, clear local state for better UX
      setIsAuthenticated(false);
      setTelegramConfig(null);
      setUserProfile(null);
      setCurrentPage('dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center">
        <div className="text-center tg-fade-in">
          <div className="tg-spinner mx-auto mb-6"></div>
          <h2 className="tg-heading-2 mb-2">Loading Telegram Automation</h2>
          <p className="tg-body-secondary">Initializing system...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show setup page
  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <div className="min-h-screen bg-telegram-bg">
          <TelegramSetup onAuthSuccess={handleAuthSuccess} />
        </div>
      </BrowserRouter>
    );
  }

  // Main application with Telegram Dark Theme
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-telegram-bg">
        {/* Sidebar Navigation */}
        <Sidebar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage}
          telegramConfig={telegramConfig}
          userProfile={userProfile}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main Content Area */}
        <div className="tg-main-content">
          {/* Header */}
          <header className="bg-telegram-surface border-b border-telegram-border px-6 py-4 sticky top-0 z-30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden fluent-btn-ghost p-2"
                  aria-label="Toggle menu"
                >
                  <span className="material-icons text-xl">
                    {sidebarOpen ? 'close' : 'menu'}
                  </span>
                </button>
                
                {/* Page Title */}
                <div>
                  <h1 className="tg-heading-2">
                    {currentPage === 'dashboard' && 'Dashboard'}
                    {currentPage === 'messages' && 'Message Templates'}
                    {currentPage === 'groups' && 'Group Management'}
                    {currentPage === 'settings' && 'Settings'}
                  </h1>
                  <p className="tg-caption hidden sm:block">
                    Telegram Automation System
                  </p>
                </div>
              </div>

              {/* Connection Status */}
              <div className="flex items-center">
                <div className="tg-card px-4 py-2 border-telegram-green border-opacity-30 bg-telegram-green bg-opacity-10">
                  <div className="flex items-center space-x-2">
                    <div className="tg-status-online animate-pulse"></div>
                    <span className="tg-body-secondary text-telegram-green font-medium">
                      {userProfile ? (
                        userProfile.username ? `@${userProfile.username}` : userProfile.first_name
                      ) : (
                        'Connected'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6 space-y-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route 
                path="/dashboard" 
                element={
                  <Dashboard 
                    telegramConfig={telegramConfig}
                    userProfile={userProfile}
                    setCurrentPage={setCurrentPage}
                  />
                } 
              />
              <Route 
                path="/messages" 
                element={<MessageManager />} 
              />
              <Route 
                path="/groups" 
                element={<GroupManager />} 
              />
              <Route 
                path="/settings" 
                element={
                  <AutomationSettings 
                    telegramConfig={telegramConfig}
                    onConfigUpdate={checkTelegramStatus}
                  />
                } 
              />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;