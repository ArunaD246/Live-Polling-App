import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Radio, PlusCircle, LayoutDashboard, LogIn, LogOut, User, Sparkles } from 'lucide-react';
import { getAuthToken, getUser, removeAuthToken, removeUser, api } from '../services/api';

export default function Navbar() {
  const [currentUser, setCurrentUser] = useState(getUser());
  const [serverOnline, setServerOnline] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setCurrentUser(getUser());
  }, [location]);

  useEffect(() => {
    // Check backend health
    api.checkHealth()
      .then(() => setServerOnline(true))
      .catch(() => setServerOnline(false));
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    removeUser();
    setCurrentUser(null);
    navigate('/');
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(255, 255, 255, 0.88)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
      padding: '0.85rem 1.5rem',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
          }}>
            <Radio size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)' }}>
              <span>Pulse<span style={{ color: 'var(--accent-primary)' }}>Poll</span></span>
              <span className="badge-live" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                <span className="pulse-dot" style={{ width: '6px', height: '6px' }}></span>
                REALTIME
              </span>
            </div>
          </div>
        </Link>

        {/* Center / Right Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {serverOnline !== null && (
            <div style={{
              fontSize: '0.75rem',
              color: serverOnline ? '#047857' : '#b91c1c',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: serverOnline ? '#ecfdf5' : '#fef2f2',
              padding: '0.3rem 0.65rem',
              borderRadius: '20px',
              border: `1px solid ${serverOnline ? '#a7f3d0' : '#fecaca'}`,
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: serverOnline ? '#10b981' : '#ef4444',
              }} />
              <span>{serverOnline ? 'Backend Online (Go/Redis)' : 'Connecting to Server...'}</span>
            </div>
          )}

          {currentUser ? (
            <>
              <Link to="/dashboard" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>

              <Link to="/create" className="btn-primary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}>
                <PlusCircle size={16} />
                <span>New Poll</span>
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#f1f5f9',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <User size={14} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{currentUser.name}</span>
                </div>

                <button onClick={handleLogout} className="btn-secondary" title="Logout" style={{ padding: '0.45rem', borderRadius: '50%' }}>
                  <LogOut size={16} color="var(--text-muted)" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}>
                <LogIn size={16} />
                <span>Sign In</span>
              </Link>
              <Link to="/register" className="btn-primary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}>
                <Sparkles size={16} />
                <span>Get Started</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
