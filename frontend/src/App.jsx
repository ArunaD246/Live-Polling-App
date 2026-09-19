import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import CreatePoll from './pages/CreatePoll';
import PollVote from './pages/PollVote';
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

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
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

            {/* Public Live Voting & Results */}
            <Route path="/poll/:id" element={<PollVote />} />
            <Route path="/poll/:id/results" element={<PollVote />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Matching LivePoll Footer */}
        <footer className="border-t border-slate-200 bg-white/80 backdrop-blur-sm py-6 text-center text-xs text-slate-500">
          <p>© 2026 LivePoll Engine | GUVI-HCL Developer Task</p>
        </footer>
      </div>
    </Router>
  );
}
