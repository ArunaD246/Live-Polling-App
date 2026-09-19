import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  RotateCw,
  Search,
  Share2,
  ExternalLink,
  Power,
  Trash2,
  Users,
  BarChart3,
  Sparkles,
  AlertCircle,
  Clock,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { api, getUser } from '../services/api';
import ShareModal from '../components/ShareModal';

export default function Dashboard() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'closed'
  const [selectedPollForShare, setSelectedPollForShare] = useState(null);

  const navigate = useNavigate();
  const socketsRef = useRef({});

  // Fetch creator's polls
  const fetchPolls = async (showSpin = false) => {
    if (showSpin) setRefreshing(true);
    setError('');

    // Pre-populate immediately from persistent storage so polls never vanish on refresh!
    const stored = api.getLocalPolls ? api.getLocalPolls() : [];
    if (stored && stored.length > 0) {
      setPolls(stored);
      setLoading(false);
    }

    try {
      const res = await api.getMyPolls();
      const list = res.polls || res.data || [];
      if (list && list.length > 0) {
        setPolls(list);
      } else if (stored && stored.length > 0) {
        setPolls(stored);
      }
    } catch (err) {
      console.warn('Fetch polls error, keeping local history:', err);
      if (stored && stored.length > 0) {
        setPolls(stored);
      }
    } finally {
      setLoading(false);
      if (showSpin) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  // Subscribe to real-time WebSockets for all active polls
  useEffect(() => {
    if (polls.length === 0) return;

    const activePolls = polls.filter((p) => p.is_active !== false && !p.is_closed);
    const activeIds = activePolls.map((p) => p.id || p._id);

    // Close sockets no longer active
    Object.keys(socketsRef.current).forEach((id) => {
      if (!activeIds.includes(id)) {
        try {
          socketsRef.current[id].close();
        } catch (_) {}
        delete socketsRef.current[id];
      }
    });

    // Open socket for active polls
    activePolls.forEach((poll) => {
      const pollId = poll.id || poll._id;
      if (socketsRef.current[pollId]) return;

      try {
        const wsUrl = api.getWebSocketUrl(pollId);
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'VOTE_UPDATE' || data.type === 'STATUS_UPDATE') {
              setPolls((prev) =>
                prev.map((p) => {
                  const currentId = p.id || p._id;
                  if (currentId !== pollId) return p;

                  const updatedOptions = (p.options || []).map((opt) => {
                    const optId = opt.id;
                    const newVotes =
                      data.votes && data.votes[optId] !== undefined
                        ? data.votes[optId]
                        : data.option_votes && data.option_votes[optId] !== undefined
                        ? data.option_votes[optId]
                        : opt.votes !== undefined
                        ? opt.votes
                        : opt.vote_count;
                    return { ...opt, votes: newVotes, vote_count: newVotes };
                  });

                  return {
                    ...p,
                    total_votes: data.total_votes !== undefined ? data.total_votes : p.total_votes,
                    options: updatedOptions,
                    is_active: data.is_active !== undefined ? data.is_active : p.is_active,
                    is_closed:
                      data.is_closed !== undefined
                        ? data.is_closed
                        : data.is_active !== undefined
                        ? !data.is_active
                        : p.is_closed,
                  };
                })
              );
            }
          } catch (e) {
            console.warn('Dashboard WS parse error:', e);
          }
        };

        socketsRef.current[pollId] = ws;
      } catch (err) {
        console.warn('Failed to establish dashboard WS for poll:', pollId);
      }
    });

    return () => {
      // Cleanup all sockets on unmount
      Object.values(socketsRef.current).forEach((ws) => {
        try {
          ws.close();
        } catch (_) {}
      });
      socketsRef.current = {};
    };
  }, [polls.map((p) => p.id || p._id).join(',')]);

  // Handle Close / Toggle Status
  const handleToggleStatus = async (poll) => {
    const pollId = poll.id || poll._id;
    const isCurrentlyActive = poll.is_active !== false && !poll.is_closed;
    const confirmMsg = isCurrentlyActive
      ? 'Are you sure you want to close this poll? Voters will no longer be able to cast votes.'
      : 'Re-open this poll for live voting?';

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updatePollStatus(pollId, !isCurrentlyActive);
      setPolls((prev) =>
        prev.map((p) => {
          if ((p.id || p._id) === pollId) {
            return {
              ...p,
              is_active: !isCurrentlyActive,
              is_closed: isCurrentlyActive,
            };
          }
          return p;
        })
      );
    } catch (err) {
      alert(err.message || 'Failed to update poll status');
    }
  };

  // Handle Delete Poll
  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deletePoll(pollId);
      setPolls((prev) => prev.filter((p) => (p.id || p._id) !== pollId));
    } catch (err) {
      alert(err.message || 'Failed to delete poll');
    }
  };

  // Filters & Metrics
  const filteredPolls = polls.filter((p) => {
    const matchesSearch = p.question?.toLowerCase().includes(searchQuery.toLowerCase());
    const isActive = p.is_active !== false && !p.is_closed;
    if (!matchesSearch) return false;
    if (filter === 'active') return isActive;
    if (filter === 'closed') return !isActive;
    return true;
  });

  const totalPollsCount = polls.length;
  const activePollsCount = polls.filter((p) => p.is_active !== false && !p.is_closed).length;
  const totalVotesCount = polls.reduce((acc, p) => acc + (p.total_votes || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Creator Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your active polls, monitor live results, and share shareable links
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPolls(true)}
            title="Refresh Polls"
            className="p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 shadow-xs transition"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <Link
            to="/create"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Poll</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="glass-card p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Polls Created</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalPollsCount}</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500 font-medium">Active Live Polls</p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                Live
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{activePollsCount}</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Votes Cast</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalVotesCount}</p>
          </div>
        </div>
      </div>

      {/* Controls: Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search polls by question..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
          />
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold self-stretch sm:self-auto">
          {[
            { id: 'all', label: 'All Polls' },
            { id: 'active', label: 'Active' },
            { id: 'closed', label: 'Closed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition ${
                filter === tab.id
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Polls List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="p-6 bg-white rounded-3xl border border-slate-200 animate-pulse space-y-4"
            >
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 rounded" />
                <div className="h-3 bg-slate-100 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPolls.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200 shadow-xs max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {searchQuery ? 'No matching polls found' : 'Create Your First Poll'}
          </h3>
          <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto">
            {searchQuery
              ? 'Try adjusting your search keywords or clear the filter.'
              : 'Launch a live poll in seconds and engage your audience in real time.'}
          </p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Poll Now</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPolls.map((poll) => {
            const pollId = poll.id || poll._id;
            const isActive = poll.is_active !== false && !poll.is_closed;
            const total = poll.total_votes || 0;
            const options = poll.options || [];

            return (
              <div
                key={pollId}
                className="glass-card p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Status & Vote Count */}
                  <div className="flex items-center justify-between mb-4">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
                        CLOSED
                      </span>
                    )}

                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      {total} {total === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>

                  {/* Question */}
                  <h3 className="text-lg font-black text-slate-900 mb-2 leading-snug">
                    {poll.question}
                  </h3>

                  {poll.description && (
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                      {poll.description}
                    </p>
                  )}

                  {/* Option Preview Bars (Top 3 options) */}
                  <div className="space-y-2 mb-6 mt-3">
                    {options.slice(0, 3).map((opt) => {
                      const votes = opt.votes !== undefined ? opt.votes : opt.vote_count || 0;
                      const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
                      return (
                        <div key={opt.id} className="text-xs">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                            <span className="truncate max-w-[200px]">{opt.text}</span>
                            <span>
                              {votes} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPollForShare(poll)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                    >
                      <Share2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Share</span>
                    </button>

                    <Link
                      to={`/poll/${pollId}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Live View</span>
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(poll)}
                      title={isActive ? 'Close Poll' : 'Re-open Poll'}
                      className={`p-2 rounded-xl transition ${
                        isActive
                          ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                          : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePoll(pollId)}
                      title="Delete Poll"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        poll={selectedPollForShare}
        isOpen={!!selectedPollForShare}
        onClose={() => setSelectedPollForShare(null)}
      />
    </div>
  );
}
