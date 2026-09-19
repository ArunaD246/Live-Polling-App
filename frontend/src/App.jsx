import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import CreatePoll from './pages/CreatePoll';
import PollVote from './pages/PollVote';
import PollResults from './pages/PollResults';
import { getAuthToken } from './services/api';

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const token = getAuthToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Auth initialMode="login" />} />
            <Route path="/register" element={<Auth initialMode="register" />} />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create" 
              element={
                <ProtectedRoute>
                  <CreatePoll />
                </ProtectedRoute>
              } 
            />

            {/* Public Live Routes */}
            <Route path="/poll/:id" element={<PollVote />} />
            <Route path="/poll/:id/results" element={<PollResults />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        {/* Footer */}
        <footer style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '1.5rem',
          textAlign: 'center',
          color: 'var(--text-dim)',
          fontSize: '0.85rem',
          background: 'rgba(9, 13, 22, 0.95)',
        }}>
          PulsePoll &copy; {new Date().getFullYear()} — Production Live Polling App with React, Go, MongoDB & Redis
        </footer>
      </div>
    </Router>
  );
}

export default App;
