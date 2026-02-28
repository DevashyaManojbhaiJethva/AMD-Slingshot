import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useStore';
import { ThemeProvider } from './components/ThemeProvider';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Dashboard } from './pages/Dashboard';
import { WorkPlan } from './pages/WorkPlan';
import { Insights } from './pages/Insights';
import { ProcessingStatus } from './pages/ProcessingPage';
import { SoilResult } from './pages/SoilResult';
import { EmailVerificationPage } from './pages/EmailVerificationPage';
import { ProfilePage } from './pages/ProfilePage';
import { ToastHost } from './components/ToastHost';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <div className="min-h-screen font-sans">
          <Navbar />
          <ToastHost />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/processing/:jobId" 
              element={
                <ProtectedRoute>
                  <ProcessingStatus />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/result/:jobId" 
              element={
                <ProtectedRoute>
                  <SoilResult />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/workplan" 
              element={
                <ProtectedRoute>
                  <WorkPlan />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/insights" 
              element={
                <ProtectedRoute>
                  <Insights />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </ThemeProvider>
    </Router>
  );
}
