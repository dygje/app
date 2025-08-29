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
    // In a real app, you might want to call a logout endpoint
    setIsAuthenticated(false);
    setTelegramConfig(null);
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center material-fade-in">
          <div className="material-progress-circular w-12 h-12 mx-auto mb-6"></div>
          <h2 className="text-title-large text-surface-900 mb-2">Loading Application</h2>
          <p className="text-body-medium text-surface-600">Please wait while we initialize...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show setup page
  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <div className="min-h-screen bg-surface-50">
          <TelegramSetup onAuthSuccess={handleAuthSuccess} />
        </div>
      </BrowserRouter>
    );
  }

  // Main application with Material Design layout
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface-50 flex">
        {/* Material Design Navigation Drawer */}
        <Sidebar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage}
          telegramConfig={telegramConfig}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        {/* Material Design Backdrop for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Material Design Main Content */}
        <main className="flex-1 flex flex-col min-h-screen lg:ml-80">
          {/* Material Design App Bar */}
          <header className="material-app-bar sticky top-0 z-20 px-4 py-4 lg:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="material-button-text lg:hidden p-2 -ml-2"
                  aria-label="Open menu"
                >
                  <span className="material-icons">menu</span>
                </button>
                
                {/* Page Title */}
                <div>
                  <h1 className="text-title-large text-white font-medium">
                    {currentPage === 'dashboard' && 'Dashboard'}
                    {currentPage === 'messages' && 'Messages'}
                    {currentPage === 'groups' && 'Groups'}
                    {currentPage === 'settings' && 'Settings'}
                  </h1>
                  <p className="text-body-small text-primary-100 hidden md:block">
                    Telegram Automation System
                  </p>
                </div>
              </div>

              {/* User Info & Actions */}
              <div className="flex items-center space-x-4">
                {/* Connection Status */}
                <div className="hidden md:flex items-center space-x-2">
                  <div className="material-status-online"></div>
                  <span className="text-body-small text-white">
                    {telegramConfig?.phone_number || 'Connected'}
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center space-x-2">
                  <button 
                    className="material-button-text p-2 text-white hover:bg-primary-700"
                    title="Refresh"
                    onClick={checkTelegramStatus}
                  >
                    <span className="material-icons">refresh</span>
                  </button>
                  
                  <button 
                    className="material-button-text p-2 text-white hover:bg-primary-700"
                    title="Notifications"
                  >
                    <span className="material-icons">notifications</span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Material Design Content Area */}
          <div className="flex-1 overflow-auto">
            <div className="container-material py-6">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <Dashboard 
                      telegramConfig={telegramConfig}
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
            </div>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;