import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  BarChart2, Users, Share2, Maximize2, Minimize2, Crown, 
  Lock, CheckCircle2, Radio, Vote, Sparkles, RefreshCw 
} from 'lucide-react';
import { api } from '../services/api';
import ShareModal from '../components/ShareModal';

export default function PollResults() {
  const { id } = useParams();

  const [poll, setPoll] = useState(null);
  const [votes, setVotes] = useState({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [activeViewers, setActiveViewers] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const wsRef = useRef(null);
  const containerRef = useRef(null);

  // 1. Fetch initial poll data via HTTP
  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const res = await api.getPoll(id);
        const p = res.poll;
        setPoll(p);
        setIsActive(p.is_active);
        setTotalVotes(p.total_votes || 0);

        // Build vote map from options
        const vMap = {};
        p.options.forEach(opt => {
          vMap[opt.id] = opt.vote_count || 0;
        });
        setVotes(vMap);
      } catch (err) {
        setError(err.message || 'Failed to load poll');
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [id]);

  // 2. Establish Real-Time WebSocket Connection
  useEffect(() => {
    let reconnectTimer;
    let isSubscribed = true;

    const connectWebSocket = () => {
      const wsUrl = api.getWebSocketUrl(id);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isSubscribed) return;
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(event.data);

          if (data.votes) {
            setVotes(data.votes);
          }
          if (data.total_votes !== undefined) {
            setTotalVotes(data.total_votes);
          }
          if (data.active_viewers !== undefined) {
            setActiveViewers(data.active_viewers);
          }
          if (data.is_active !== undefined) {
            setIsActive(data.is_active);
          }
        } catch (err) {
          console.error("WebSocket message parse error:", err);
        }
      };

      ws.onclose = () => {
        if (!isSubscribed) return;
        setWsConnected(false);
        // Attempt reconnect in 2 seconds
        reconnectTimer = setTimeout(connectWebSocket, 2500);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      isSubscribed = false;
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [id]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error("Fullscreen error:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: '600px', margin: '6rem auto', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
        <p>Connecting to live poll stream...</p>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div style={{ maxWidth: '540px', margin: '4rem auto', padding: '0 1.5rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Poll Unavailable</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'Poll not found'}</p>
          <Link to="/" className="btn-secondary">Go to Home</Link>
        </div>
      </div>
    );
  }

  // Calculate highest vote count to highlight current winner
  let highestVote = -1;
  Object.values(votes).forEach(count => {
    if (count > highestVote) highestVote = count;
  });

  return (
    <div
      ref={containerRef}
      style={{
        maxWidth: isFullscreen ? '100%' : '880px',
        margin: isFullscreen ? '0' : '2.5rem auto 5rem auto',
        padding: isFullscreen ? '3rem' : '0 1.5rem',
        minHeight: isFullscreen ? '100vh' : 'auto',
        background: isFullscreen ? '#070a12' : 'transparent',
      }}
    >
      <div className="glass-panel animate-fade-in" style={{ padding: isFullscreen ? '3.5rem' : '2.5rem' }}>
        {/* Top Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Live Status Badge */}
            <span className={isActive ? "badge-live" : "btn-secondary"} style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
              {isActive ? (
                <>
                  <span className="pulse-dot"></span>
                  <span>LIVE POLL</span>
                </>
              ) : (
                <>
                  <Lock size={13} />
                  <span>POLL CLOSED</span>
                </>
              )}
            </span>

            {/* Realtime WebSocket Indicator */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              color: wsConnected ? '#34d399' : '#fbbf24',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '0.3rem 0.65rem',
              borderRadius: '9999px',
              border: '1px solid var(--border-subtle)',
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: wsConnected ? '#10b981' : '#f59e0b',
              }} />
              <span>{wsConnected ? 'Redis Pub/Sub Connected' : 'Reconnecting stream...'}</span>
            </span>

            {/* Active Viewers Count */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '0.3rem 0.65rem',
              borderRadius: '9999px',
              border: '1px solid var(--border-subtle)',
            }}>
              <Users size={13} color="var(--accent-cyan)" />
              <span>{activeViewers} Watching Live</span>
            </span>
          </div>

          {/* Presenter Mode and Share Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={() => setIsShareOpen(true)}
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              <Share2 size={16} />
              <span>Share & QR</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
              title={isFullscreen ? "Exit Presenter Mode" : "Fullscreen Presenter Mode"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              <span>{isFullscreen ? 'Exit Presenter' : 'Presenter Mode'}</span>
            </button>
          </div>
        </div>

        {/* Question Title & Description */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{
            fontSize: isFullscreen ? '2.4rem' : '1.85rem',
            marginBottom: '0.6rem',
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
          }}>
            {poll.question}
          </h1>
          {poll.description && (
            <p style={{ color: 'var(--text-muted)', fontSize: isFullscreen ? '1.15rem' : '1rem' }}>
              {poll.description}
            </p>
          )}
        </div>

        {/* Total Votes Counter Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          marginBottom: '2rem',
        }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Audience Responses</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
            {totalVotes} {totalVotes === 1 ? 'Vote' : 'Votes'}
          </span>
        </div>

        {/* Live Option Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {poll.options.map((option, index) => {
            const voteCount = votes[option.id] !== undefined ? votes[option.id] : (option.vote_count || 0);
            const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(1) : '0.0';
            const isLeading = highestVote > 0 && voteCount === highestVote;

            // Harmonious accent color sequence
            const barGradients = [
              'linear-gradient(90deg, #6366f1, #818cf8)',
              'linear-gradient(90deg, #06b6d4, #38bdf8)',
              'linear-gradient(90deg, #10b981, #34d399)',
              'linear-gradient(90deg, #f59e0b, #fbbf24)',
              'linear-gradient(90deg, #ec4899, #f472b6)',
              'linear-gradient(90deg, #8b5cf6, #c084fc)',
            ];
            const activeGradient = barGradients[index % barGradients.length];

            return (
              <div
                key={option.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: isLeading ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: isFullscreen ? '1.5rem 1.75rem' : '1.2rem 1.4rem',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  boxShadow: isLeading ? '0 0 20px rgba(99, 102, 241, 0.15)' : 'none',
                }}
              >
                {/* Header row: Option Text, Leading badge, Count & Percentage */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.85rem',
                  position: 'relative',
                  zIndex: 2,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{
                      fontSize: isFullscreen ? '1.25rem' : '1.05rem',
                      fontWeight: 600,
                      color: isLeading ? 'var(--text-main)' : 'var(--text-main)',
                    }}>
                      {option.text}
                    </span>
                    {isLeading && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#fbbf24',
                        background: 'rgba(245, 158, 11, 0.15)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                      }}>
                        <Crown size={12} />
                        <span>LEADING</span>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                    <span style={{
                      fontSize: isFullscreen ? '1.5rem' : '1.25rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-heading)',
                    }}>
                      {percentage}%
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      ({voteCount} {voteCount === 1 ? 'vote' : 'votes'})
                    </span>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="vote-progress-track" style={{ height: isFullscreen ? '16px' : '12px' }}>
                  <div
                    className="vote-progress-fill"
                    style={{
                      width: `${percentage}%`,
                      background: activeGradient,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <Link
            to={`/poll/${id}`}
            className="btn-primary"
            style={{ fontSize: '0.9rem', padding: '0.7rem 1.4rem' }}
          >
            <Vote size={16} />
            <span>Cast Your Vote as Audience</span>
          </Link>

          <button
            onClick={() => setIsShareOpen(true)}
            className="btn-secondary"
            style={{ fontSize: '0.9rem', padding: '0.7rem 1.4rem' }}
          >
            <Share2 size={16} />
            <span>Display QR Code for Audience</span>
          </button>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        poll={poll}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
}
