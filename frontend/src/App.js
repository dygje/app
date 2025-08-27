import { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Dashboard from "./components/Dashboard";
import TelegramSetup from "./components/TelegramSetup";
import MessageManager from "./components/MessageManager";
import GroupManager from "./components/GroupManager";
import BlacklistManager from "./components/BlacklistManager";
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show setup page
  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <TelegramSetup onAuthSuccess={handleAuthSuccess} />
        </div>
      </BrowserRouter>
    );
  }

  // Main application with sidebar navigation
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage}
          telegramConfig={telegramConfig}
          onLogout={handleLogout}
        />
        
        <main className="flex-1 p-6">
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
              path="/blacklist" 
              element={<BlacklistManager />} 
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
    </BrowserRouter>
  );
}

export default App;