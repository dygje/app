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
    setIsAuthenticated(false);
    setTelegramConfig(null);
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div className="admin-container flex items-center justify-center">
        <div className="text-center fade-in">
          <div className="loading-spinner mx-auto mb-4"></div>
          <h2 className="text-xl font-medium text-gray-200 mb-2">Loading Application</h2>
          <p className="text-gray-400">Initializing Telegram automation system...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show setup page
  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <div className="admin-container">
          <TelegramSetup onAuthSuccess={handleAuthSuccess} />
        </div>
      </BrowserRouter>
    );
  }

  // Main application with dark admin layout
  return (
    <BrowserRouter>
      <div className="admin-container">
        {/* Sidebar Navigation */}
        <Sidebar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage}
          telegramConfig={telegramConfig}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main Content Area */}
        <div className="admin-main">
          {/* Header */}
          <header className="admin-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="btn-ghost p-2 md:hidden"
                  aria-label="Open menu"
                >
                  <span className="material-icons">menu</span>
                </button>
                
                {/* Page Title */}
                <div>
                  <h1 className="text-xl font-semibold text-gray-100">
                    {currentPage === 'dashboard' && 'Dashboard'}
                    {currentPage === 'messages' && 'Message Templates'}
                    {currentPage === 'groups' && 'Group Management'}
                    {currentPage === 'settings' && 'Settings'}
                  </h1>
                  <p className="text-sm text-gray-400 hidden sm:block">
                    Telegram Automation System
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-300">
                    {telegramConfig?.phone_number || 'Connected'}
                  </span>
                </div>
                
                <button 
                  className="btn-ghost p-2"
                  title="Refresh Status"
                  onClick={checkTelegramStatus}
                >
                  <span className="material-icons icon">refresh</span>
                </button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="admin-content">
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
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;