import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusCircle, BarChart2, Share2, ToggleLeft, ToggleRight, Trash2, 
  ExternalLink, Download, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw 
} from 'lucide-react';
import { api } from '../services/api';
import ShareModal from '../components/ShareModal';

export default function Dashboard() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSharePoll, setActiveSharePoll] = useState(null);

  const fetchPolls = async () => {
    setLoading(true);
    try {
      const res = await api.getMyPolls();
      setPolls(res.polls || []);
    } catch (err) {
      setError(err.message || 'Failed to load your polls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const handleToggleStatus = async (pollId, currentStatus) => {
    try {
      await api.updatePollStatus(pollId, !currentStatus);
      setPolls(polls.map(p => p.id === pollId ? { ...p, is_active: !currentStatus } : p));
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleDelete = async (pollId) => {
    if (!window.confirm('Are you sure you want to permanently delete this poll?')) return;
    try {
      await api.deletePoll(pollId);
      setPolls(polls.filter(p => p.id !== pollId));
    } catch (err) {
      alert('Failed to delete poll: ' + err.message);
    }
  };

  const exportCSV = (poll) => {
    const headers = ['Option ID', 'Option Text', 'Votes', 'Percentage'];
    const total = poll.total_votes || 1;
    const rows = poll.options.map(opt => [
      opt.id,
      `"${opt.text.replace(/"/g, '""')}"`,
      opt.vote_count,
      `${((opt.vote_count / (poll.total_votes || 1)) * 100).toFixed(1)}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `poll_${poll.id}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const totalVotesCount = polls.reduce((sum, p) => sum + (p.total_votes || 0), 0);
  const activePollsCount = polls.filter(p => p.is_active).length;

  return (
    <div style={{ maxWidth: '1140px', margin: '2rem auto 5rem auto', padding: '0 1.5rem' }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Creator Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Manage your active polls and monitor live audience responses.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchPolls} className="btn-secondary" title="Refresh Polls">
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <Link to="/create" className="btn-primary">
            <PlusCircle size={18} />
            <span>Create Poll</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem',
      }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Total Polls Created</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>{polls.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Active Live Polls</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{activePollsCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Total Votes Cast</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{totalVotesCount}</div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: '#fda4af',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Polls List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
          <p>Loading your polls...</p>
        </div>
      ) : polls.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <BarChart2 size={48} color="var(--text-dim)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>No polls created yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            Get started by launching your first live poll for your audience or team.
          </p>
          <Link to="/create" className="btn-primary">
            <PlusCircle size={18} />
            <span>Create Your First Poll</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {polls.map((poll) => (
            <div key={poll.id} className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1rem',
              }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                    <span className={poll.is_active ? "badge-live" : "btn-secondary"} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                      {poll.is_active ? (
                        <>
                          <span className="pulse-dot"></span>
                          <span>LIVE</span>
                        </>
                      ) : (
                        <span>CLOSED</span>
                      )}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      Created {new Date(poll.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>{poll.question}</h3>
                  {poll.description && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '0.5rem' }}>
                      {poll.description}
                    </p>
                  )}
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-main)' }}>{poll.total_votes || 0}</strong> votes recorded · {poll.options?.length} options
                  </div>
                </div>

                {/* Status Toggle & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleToggleStatus(poll.id, poll.is_active)}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
                    title={poll.is_active ? "Close poll" : "Re-open poll"}
                  >
                    {poll.is_active ? <ToggleRight size={18} color="#10b981" /> : <ToggleLeft size={18} color="#64748b" />}
                    <span>{poll.is_active ? 'Active' : 'Closed'}</span>
                  </button>

                  <button
                    onClick={() => setActiveSharePoll(poll)}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
                  >
                    <Share2 size={16} />
                    <span>Share / QR</span>
                  </button>

                  <Link
                    to={`/poll/${poll.id}/results`}
                    className="btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                  >
                    <BarChart2 size={16} />
                    <span>Live Results</span>
                  </Link>

                  <button
                    onClick={() => exportCSV(poll)}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.65rem' }}
                    title="Export CSV"
                  >
                    <Download size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(poll.id)}
                    className="btn-danger"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.65rem' }}
                    title="Delete Poll"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        poll={activeSharePoll}
        isOpen={!!activeSharePoll}
        onClose={() => setActiveSharePoll(null)}
      />
    </div>
  );
}
