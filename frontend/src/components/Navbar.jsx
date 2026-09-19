import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, PlusCircle, LayoutDashboard, User, LogOut } from 'lucide-react';
import { getUser, removeAuthToken, removeUser } from '../services/api';

export default function Navbar() {
  const user = getUser();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    removeAuthToken();
    removeUser();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tight">
            Live<span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">Poll</span>
          </span>
        </Link>

        {/* Right Navigation Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/create"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-600/20 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Poll</span>
              </Link>

              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition ${
                  location.pathname === '/dashboard'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-blue-600" />
                <span>Dashboard</span>
              </Link>

              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

              <div className="flex items-center gap-2 text-xs font-medium text-slate-600 pl-1">
                <span className="p-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                </span>
                <span className="hidden sm:inline font-semibold text-slate-800">
                  {user.name || user.username || user.email?.split('@')[0] || 'Creator'}
                </span>
                <button
                  onClick={handleLogout}
                  title="Log Out"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/create"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                <PlusCircle className="w-4 h-4 text-blue-600" />
                <span>Create Poll</span>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-slate-700 hover:text-blue-600 font-bold text-xs transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-600/20 transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
