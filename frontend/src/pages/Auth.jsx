import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { api, setAuthToken, setUser, getUser } from '../services/api';

export default function Auth({ initialMode = 'login' }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    const user = getUser();
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    setIsLogin(initialMode === 'login');
    setError('');
  }, [initialMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login(email.trim(), password);
        setAuthToken(res.token);
        setUser(res.user);
        navigate('/dashboard');
      } else {
        if (!name.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        const res = await api.register(name.trim(), email.trim(), password);
        setAuthToken(res.token);
        setUser(res.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('alex@pollmaster.io');
    setPassword('password123');
    setError('');
    setLoading(true);

    try {
      // First attempt login
      try {
        const res = await api.login('alex@pollmaster.io', 'password123');
        setAuthToken(res.token);
        setUser(res.user);
        navigate('/dashboard');
        return;
      } catch (loginErr) {
        // If not registered yet, auto-register demo user
        const res = await api.register('Alex Demo', 'alex@pollmaster.io', 'password123');
        setAuthToken(res.token);
        setUser(res.user);
        navigate('/dashboard');
      }
    } catch (err) {
      // Fallback local mock user so demo always succeeds even in standalone preview
      const demoUser = { id: 'demo_user_1', name: 'Alex Demo', email: 'alex@pollmaster.io' };
      setAuthToken('demo_token_12345');
      setUser(demoUser);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex">
      {/* Left Column: Visual Showcase (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Background Gradients & Glow Orbs */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900" />
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl animate-pulse" />

        {/* Top Logo */}
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-500 to-sky-400 text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              Live<span className="text-blue-400">Poll</span>
            </span>
          </Link>
        </div>

        {/* Center Presentation Pitch */}
        <div className="relative z-10 max-w-md">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
            Real-time Polling Architecture
          </span>
          <h2 className="text-3xl font-black leading-tight mb-4 text-white">
            Engage your audience with zero-latency live votes.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Create polls in seconds, share instant links with QR codes, and monitor vote changes in real time via Redis Pub/Sub and WebSockets.
          </p>

          <div className="space-y-3">
            {[
              'Sub-second real-time vote updates via WebSockets',
              'Instant QR codes for effortless mobile voting',
              'Production-ready Go, Gin, Redis & MongoDB backend',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="relative z-10 text-xs text-slate-500">
          Powered by Go Engine, Redis Pub/Sub & React
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50">
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
              {isLogin ? 'Welcome Back' : 'Create Free Account'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {isLogin
                ? 'Enter your credentials to continue to your dashboard'
                : 'Start creating live interactive polls in 30 seconds'}
            </p>
          </div>

          {/* Quick 1-Click Demo Login Banner */}
          <div className="mb-6 p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/70 flex items-center justify-between gap-3">
            <div className="min-w-0 text-left">
              <span className="text-xs font-bold text-blue-900 block">Want a quick preview?</span>
              <span className="text-[11px] text-blue-700">1-click test credentials</span>
            </div>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 shadow-xs transition"
            >
              Demo Login
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
              {!isLogin && (
                <p className="text-[11px] text-slate-400 mt-1">At least 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Please wait...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Free Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch Login / Register */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            {isLogin ? (
              <p className="text-xs text-slate-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError('');
                  }}
                  className="font-bold text-blue-600 hover:text-blue-700 ml-1 transition"
                >
                  Create free account
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError('');
                  }}
                  className="font-bold text-blue-600 hover:text-blue-700 ml-1 transition"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
