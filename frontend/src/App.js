import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { HelmetProvider } from 'react-helmet-async';

// Component Imports
// Component Imports
import PublicHeader from './components/PublicHeader';
import AdminLayout from './components/AdminLayout';

// Page Imports
import Home from './pages/Home';
import Login from './pages/Login';
import RequestForm from './pages/RequestForm';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import AdultMembers from './pages/AdultMembers';
import Zones from './pages/Zones';
import Requests from './pages/Requests';
import AuditLogsPage from './pages/AuditLogsPage';
import DeletedMembers from './pages/DeletedMembers';

// PrivateRoute wrapper (authenticates token & admin role)
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');

  const toggleColorMode = () => {
    setMode((prevMode) => {
      const nextMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', nextMode);
      return nextMode;
    });
  };

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#1976d2', light: '#e3f2fd', contrastText: '#ffffff' },
      background: {
        default: mode === 'light' ? '#f8f9fa' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
      },
      text: {
        primary: mode === 'light' ? '#1e293b' : '#f8fafc',
        secondary: mode === 'light' ? '#64748b' : '#94a3b8',
      }
    },
    typography: {
      fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    shape: {
      borderRadius: 8
    }
  }), [mode]);

  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            {/* Public routes (rendered with PublicHeader) */}
            <Route path="/" element={<><PublicHeader /><Home /></>} />
            <Route path="/login" element={<><PublicHeader /><Login /></>} />
            <Route path="/request" element={<><PublicHeader /><RequestForm /></>} />

            {/* Admin-only routes wrapped inside responsive AdminLayout */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <AdminLayout mode={mode} toggleColorMode={toggleColorMode}>
                    <Dashboard />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/members"
              element={
                <PrivateRoute>
                  <AdminLayout mode={mode} toggleColorMode={toggleColorMode}>
                    <Members />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/members/adults"
              element={
                <PrivateRoute>
                  <AdminLayout mode={mode} toggleColorMode={toggleColorMode}>
                    <AdultMembers />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/zones"
              element={
                <PrivateRoute>
                  <AdminLayout mode={mode} toggleColorMode={toggleColorMode}>
                    <Zones />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/requests"
              element={
                <PrivateRoute>
                  <AdminLayout mode={mode} toggleColorMode={toggleColorMode}>
                    <Requests />
                  </AdminLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <PrivateRoute>
                  <AdminLayout mode={mode} toggleColorMode={toggleColorMode}>
                    <AuditLogsPage />
                  </AdminLayout>
                </PrivateRoute>
              }
            />

            <Route
              path="/members/deleted"
              element={
                <PrivateRoute>
                  <AdminLayout mode={mode} toggleColorMode={toggleColorMode}>
                    <DeletedMembers />
                  </AdminLayout>
                </PrivateRoute>
              }
            />


            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;