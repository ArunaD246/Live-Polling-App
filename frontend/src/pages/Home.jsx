import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Zap, ShieldCheck, BarChart3, Users, QrCode, Radio } from 'lucide-react';
import { getAuthToken } from '../services/api';

export default function Home() {
  const [pollCode, setPollCode] = useState('');
  const navigate = useNavigate();
  const token = getAuthToken();

  const handleJoinPoll = (e) => {
    e.preventDefault();
    if (!pollCode.trim()) return;
    // Extract ID if a full URL was pasted
    let id = pollCode.trim();
    if (id.includes('/poll/')) {
      id = id.split('/poll/')[1].split('/')[0];
    }
    navigate(`/poll/${id}`);
  };

  return (
    <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '3rem 1.5rem 6rem 1.5rem' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#eef2ff',
          border: '1px solid #c7d2fe',
          borderRadius: '9999px',
          padding: '0.4rem 1.25rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#4f46e5',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 6px rgba(79, 70, 229, 0.08)',
        }}>
          <Sparkles size={16} color="#4f46e5" />
          <span>Powered by Go, Gin, Redis Pub/Sub & MongoDB</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          marginBottom: '1.25rem',
          lineHeight: 1.15,
          color: 'var(--text-main)',
        }}>
          Live Polling that updates <br />
          <span style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #0284c7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            instantly, with zero page reloads.
          </span>
        </h1>

        <p style={{
          fontSize: '1.15rem',
          color: 'var(--text-muted)',
          maxWidth: '680px',
          margin: '0 auto 2.5rem auto',
        }}>
          Create a live poll, share the interactive QR or link with your audience, and watch the results stream in real-time driven by Redis sub-millisecond atomic events.
        </p>

        {/* Call to Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '3rem',
        }}>
          <Link to={token ? "/create" : "/register"} className="btn-primary" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}>
            <span>{token ? "Create a Live Poll" : "Get Started Free"}</span>
            <ArrowRight size={18} />
          </Link>

          <Link to={token ? "/dashboard" : "/login"} className="btn-secondary" style={{ padding: '0.9rem 1.8rem', fontSize: '1.05rem' }}>
            <span>{token ? "Go to Dashboard" : "Sign In"}</span>
          </Link>
        </div>

        {/* Enter Poll ID Code Box */}
        <form onSubmit={handleJoinPoll} style={{
          maxWidth: '480px',
          margin: '0 auto',
          display: 'flex',
          gap: '0.5rem',
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          padding: '0.4rem',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
        }}>
          <input
            type="text"
            placeholder="Have a Poll Code or Link? Paste it here..."
            value={pollCode}
            onChange={(e) => setPollCode(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '0.75rem 1rem',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
            }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.4rem' }}>
            <span>Join Poll</span>
          </button>
        </form>
      </div>

      {/* 4-Step Interactive Flow Section */}
      <div style={{ marginBottom: '5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>How PulsePoll Works</h2>
          <p style={{ color: 'var(--text-muted)' }}>The complete end-to-end interactive flow</p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
        }}>
          {[
            {
              step: '01',
              title: 'Create Poll',
              desc: 'Authenticated creators set questions, options, expiration, and voting rules.',
              icon: <Zap size={22} color="#4f46e5" />,
            },
            {
              step: '02',
              title: 'Share Link / QR',
              desc: 'One-click shareable link and dynamic scannable QR codes for mobile audiences.',
              icon: <QrCode size={22} color="#7c3aed" />,
            },
            {
              step: '03',
              title: 'Audience Votes',
              desc: 'Voters cast selections instantly with duplicate vote guards and smooth animations.',
              icon: <Users size={22} color="#0284c7" />,
            },
            {
              step: '04',
              title: 'Live Realtime Results',
              desc: 'Redis Pub/Sub broadcasts vote deltas to all WebSockets with zero page refresh.',
              icon: <BarChart3 size={22} color="#059669" />,
            },
          ].map((item, idx) => (
            <div key={idx} className="glass-card" style={{ padding: '1.75rem', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                fontSize: '1.8rem',
                fontWeight: 800,
                color: 'rgba(15, 23, 42, 0.08)',
              }}>
                {item.step}
              </div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}>
                {item.icon}
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem', color: 'var(--text-main)' }}>{item.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack & Architecture Highlight */}
      <div className="glass-panel" style={{ padding: '2.5rem', background: '#ffffff' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.4rem', color: 'var(--text-main)' }}>Engineered for True Real-Time Performance</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Built strictly to the required specifications, where every piece of the stack does meaningful work.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1.25rem',
        }}>
          <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: '#0284c7', fontWeight: 700, marginBottom: '0.25rem' }}>React Frontend</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Modern modular client with WebSocket listeners, reactive animated progress gauges, and mobile-first audience view.
            </p>
          </div>

          <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: '#4f46e5', fontWeight: 700, marginBottom: '0.25rem' }}>Go (Gin) Backend</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              High-concurrency compiled backend with strict input validation, JWT auth, and WebSocket connection hub.
            </p>
          </div>

          <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: '#e11d48', fontWeight: 700, marginBottom: '0.25rem' }}>Redis Realtime Bus</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Drives atomic in-memory vote counters (<code style={{ color: '#b91c1c', background: '#fee2e2', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>HINCRBY</code>) and instant event fanout via Redis Pub/Sub.
            </p>
          </div>

          <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: '#059669', fontWeight: 700, marginBottom: '0.25rem' }}>MongoDB Database</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Durable document storage for user accounts, poll schemas, and tamper-proof vote audit logs with unique indexes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
