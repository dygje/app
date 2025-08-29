import { useState, useEffect } from "react";
import "./App.css";
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

  // Debug useEffect to track sidebar state changes
  useEffect(() => {
    console.log('Sidebar state changed to:', sidebarOpen);
  }, [sidebarOpen]);

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
      <div className="app-container flex items-center justify-center">
        <div className="text-center fade-in">
          <div className="loading-spinner mx-auto mb-6 w-8 h-8"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Telegram Automation</h2>
          <p className="text-gray-600">Initializing system...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show setup page
  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <div className="app-container">
          <TelegramSetup onAuthSuccess={handleAuthSuccess} />
        </div>
      </BrowserRouter>
    );
  }

  // Main application with clean layout
  return (
    <BrowserRouter>
      <div className="app-container">
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
        
        {/* Mobile Backdrop - Enhanced */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main Content Area */}
        <div className="main-content">
          {/* Header with Connection Status */}
          <header className="header">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button - Enhanced */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center relative z-50"
                  aria-label="Toggle menu"
                  style={{ 
                    minWidth: '44px', 
                    minHeight: '44px'
                  }}
                >
                  <span className="material-icons text-xl text-gray-700">
                    {sidebarOpen ? 'close' : 'menu'}
                  </span>
                </button>
                
                {/* Page Title */}
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {currentPage === 'dashboard' && 'Dashboard'}
                    {currentPage === 'messages' && 'Message Templates'}
                    {currentPage === 'groups' && 'Group Management'}
                    {currentPage === 'settings' && 'Settings'}
                  </h1>
                  <p className="text-sm text-gray-500 hidden sm:block">
                    Telegram Automation System
                  </p>
                </div>
              </div>

              {/* Connection Status - Always Visible */}
              <div className="flex items-center">
                {/* Connection Status */}
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-700">
                    {userProfile ? (
                      userProfile.username ? `@${userProfile.username}` : userProfile.first_name
                    ) : (
                      'Connected'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-4 sm:p-6 space-y-6">
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