import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, BarChart2, Radio, Zap } from 'lucide-react';
import { getUser } from '../services/api';

function PreviewBar({ label, text, pct, color, delay = 0 }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(pct);
    }, 100 + delay);
    return () => clearTimeout(timer);
  }, [pct, delay]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-700 flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
            style={{ backgroundColor: color }}
          >
            {label}
          </span>
          <span className="truncate">{text}</span>
        </span>
        <span className="text-slate-500 font-bold">{pct}%</span>
      </div>
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${width}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const user = getUser();
  const [pulseCount, setPulseCount] = useState(24);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseCount((prev) => (prev < 99 ? prev + 1 : 24));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: '🚀',
      title: 'Launch a live poll',
      desc: 'Create instant, engaging questions and collect real-time responses from your audience without complicated setups.',
    },
    {
      icon: '📊',
      title: 'Track reactions',
      desc: 'Watch live updates powered by Redis Pub/Sub and share the current momentum on the results view in real time.',
    },
    {
      icon: '🎯',
      title: 'Keep it simple',
      desc: 'A clean polling flow for events, product feedback, classroom polls, and team decisions with instant QR codes.',
    },
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 40%, #f8fbff 100%)',
      }}
    >
      {/* Background Dot Pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #bfdbfe 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.3,
        }}
      />

      {/* Hero Section */}
      <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column: Headline & Action */}
          <div>
            {/* Pill Badges */}
            <div className="flex flex-wrap gap-2 mb-8">
              {['Live updates', 'Realtime voting', 'Responsive UI'].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold border border-blue-200 shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-tight mb-6 tracking-tight">
              Turn every decision into a{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">
                  shared moment.
                </span>
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  viewBox="0 0 200 8"
                  fill="none"
                >
                  <path
                    d="M0 6 Q50 0 100 5 Q150 10 200 4"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.4"
                  />
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-500 leading-relaxed mb-10 max-w-lg">
              Spark engagement with fast, polished polls that update in real time and let your audience vote without friction.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={user ? '/create' : '/register'}
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md shadow-blue-200"
              >
                <span>Create a poll</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-blue-50 text-slate-700 font-bold text-sm border border-blue-200 transition-all shadow-xs"
                >
                  My Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-blue-50 text-slate-700 font-bold text-sm border border-blue-200 transition-all shadow-xs"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>

          {/* Right Column: Live Interactive Poll Preview Card */}
          <div className="relative">
            {/* Top-left Floating Badge */}
            <div className="absolute -top-4 -left-4 z-10 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Audience pulse</p>
                <p className="text-sm font-black text-slate-900">98% engagement</p>
              </div>
            </div>

            {/* Main Interactive Preview Card */}
            <div className="bg-white rounded-3xl border border-blue-100 shadow-xl shadow-blue-100/50 p-6 sm:p-8 relative">
              <div className="flex items-center justify-between mb-5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Open poll
                </span>
                <span className="text-xs text-slate-400 font-medium">{pulseCount} votes</span>
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-6">
                What should we launch next?
              </h3>

              <div className="space-y-4 mb-6">
                <PreviewBar label="A" text="Real-time WebSocket Live Charts" pct={54} color="#3b82f6" delay={0} />
                <PreviewBar label="B" text="Instant Mobile QR Scanning" pct={31} color="#8b5cf6" delay={150} />
                <PreviewBar label="C" text="Export Analytics & CSV Report" pct={15} color="#10b981" delay={300} />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live results • updates in real-time
                </span>
                <div className="flex -space-x-1.5">
                  {['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'].map((bg, idx) => (
                    <div
                      key={idx}
                      className="w-5 h-5 rounded-full border-2 border-white shadow-2xs"
                      style={{ background: bg }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom-right Floating Notification Badge */}
            <div className="absolute -bottom-3 -right-4 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-lg flex items-center gap-2.5">
              <span className="text-base">⚡</span>
              <div>
                <p className="text-xs font-bold text-slate-900">New vote!</p>
                <p className="text-[10px] text-slate-400">Option A • just now</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        className="border-t border-blue-100"
        style={{ background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((item) => (
              <div
                key={item.title}
                className="group p-6 rounded-2xl bg-white border border-blue-100 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/60 transition-all duration-300"
              >
                <span className="text-2xl mb-4 block">{item.icon}</span>
                <h3 className="font-black text-slate-900 mb-2 text-base">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conversion CTA Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-black text-slate-900 mb-4">Ready to run your first poll?</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          Free to use. No credit card required. Start creating polls in 30 seconds.
        </p>
        <Link
          to={user ? '/create' : '/register'}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-200 transition-all"
        >
          <span>{user ? 'Create a poll' : 'Get started free'}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
