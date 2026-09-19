import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Share2,
  Check,
  Send,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  Radio,
  CheckCircle2,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { api, hasDeviceVoted, markDeviceVoted, getDeviceVoteRecord } from '../services/api';
import ConnectionStatus from '../components/ConnectionStatus';
import ShareModal from '../components/ShareModal';

const OPTION_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
];

export default function PollVote() {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [showBars, setShowBars] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Load poll data
  const fetchPoll = async () => {
    // Pre-populate immediately from local history if present
    const local = api.getLocalPoll ? api.getLocalPoll(id) : null;
    if (local) {
      setPoll(local);
      setLoading(false);
      const pollId = local.id || local._id;
      if (hasDeviceVoted(pollId)) {
        setHasVoted(true);
        const record = getDeviceVoteRecord(pollId);
        if (record && record.optionIds) {
          setSelectedOptions(record.optionIds);
        }
      }
    }

    try {
      const res = await api.getPoll(id);
      const pollData = res.poll || res.data || res;
      setPoll(pollData);

      // Check if user already voted from this device
      const pollId = pollData.id || pollData._id;
      if (hasDeviceVoted(pollId)) {
        setHasVoted(true);
        const record = getDeviceVoteRecord(pollId);
        if (record && record.optionIds) {
          setSelectedOptions(record.optionIds);
        }
      }
    } catch (err) {
      console.error('Fetch poll error:', err);
      if (!local) {
        setError(err.message || 'Poll not found or unavailable.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoll();
  }, [id]);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!poll) return;
    const pollId = poll.id || poll._id;
    let isActive = true;

    const connectWebSocket = () => {
      try {
        const wsUrl = api.getWebSocketUrl(pollId);
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          if (!isActive) return;
          console.log('⚡ Realtime WebSocket connected to Poll room:', pollId);
          setConnectionStatus('connected');
        };

        socket.onmessage = (event) => {
          if (!isActive) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'VOTE_UPDATE' || data.type === 'STATUS_UPDATE') {
              setPoll((prev) => {
                if (!prev) return prev;
                const updatedOptions = (prev.options || []).map((opt) => {
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
                  ...prev,
                  total_votes:
                    data.total_votes !== undefined ? data.total_votes : prev.total_votes,
                  options: updatedOptions,
                  is_active: data.is_active !== undefined ? data.is_active : prev.is_active,
                  is_closed:
                    data.is_closed !== undefined
                      ? data.is_closed
                      : data.is_active !== undefined
                      ? !data.is_active
                      : prev.is_closed,
                };
              });
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        socket.onerror = (err) => {
          if (!isActive) return;
          console.warn('WebSocket connection error:', err);
          setConnectionStatus('offline');
        };

        socket.onclose = () => {
          if (!isActive) return;
          console.log('WebSocket disconnected. Retrying in 3 seconds...');
          setConnectionStatus('offline');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isActive) connectWebSocket();
          }, 3000);
        };
      } catch (err) {
        console.warn('Failed to establish WebSocket connection:', err);
        setConnectionStatus('offline');
      }
    };

    connectWebSocket();

    return () => {
      isActive = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (_) {}
      }
    };
  }, [poll?.id, poll?._id]);

  // Handle Option Click
  const handleSelectOption = (optionId) => {
    const isClosed = poll?.is_closed || poll?.is_active === false;
    if (hasVoted || isClosed) return;

    if (poll?.allow_multiple) {
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions(selectedOptions.filter((oid) => oid !== optionId));
      } else {
        setSelectedOptions([...selectedOptions, optionId]);
      }
    } else {
      setSelectedOptions([optionId]);
    }
  };

  // Submit Vote
  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    if (selectedOptions.length === 0) {
      setError('Please select at least one option to submit your vote.');
      return;
    }

    setError('');
    setSubmitting(true);
    const pollId = poll.id || poll._id;

    try {
      const res = await api.castVote(pollId, selectedOptions);

      // Trigger Confetti
      confetti({
        particleCount: 85,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'],
      });

      setHasVoted(true);
      markDeviceVoted(pollId, selectedOptions);

      // Local state update immediately
      if (res && res.poll) {
        setPoll(res.poll);
      } else {
        fetchPoll();
      }
    } catch (err) {
      console.error('Vote submission error:', err);
      setError(err.message || 'Failed to submit vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="glass-card p-12 rounded-3xl border border-slate-200 animate-pulse shadow-xs">
          <div className="h-4 bg-slate-200 rounded w-1/4 mx-auto mb-4" />
          <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto mb-8" />
          <div className="space-y-4">
            <div className="h-14 bg-slate-100 rounded-2xl" />
            <div className="h-14 bg-slate-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="glass-card p-8 rounded-3xl border border-slate-200 shadow-md">
          <div className="p-3 rounded-full bg-rose-50 text-rose-600 w-fit mx-auto mb-4 border border-rose-200">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Poll Unavailable</h2>
          <p className="text-xs text-slate-500 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Homepage</span>
          </Link>
        </div>
      </div>
    );
  }

  const isClosed =
    poll.is_closed ||
    poll.is_active === false ||
    (poll.expires_at && new Date() > new Date(poll.expires_at));
  const totalVotes = poll.total_votes || 0;
  const showResults = hasVoted || isClosed || showBars;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Controls: Real-time Status, Total Votes & Share Button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <ConnectionStatus status={connectionStatus} />
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{totalVotes}</span>
            <span>{totalVotes === 1 ? 'total vote' : 'total votes'}</span>
          </span>
        </div>

        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-xs transition"
        >
          <Share2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Share Poll</span>
        </button>
      </div>

      {/* Main Glass Card */}
      <div className="glass-card p-6 sm:p-10 rounded-3xl border border-slate-200/90 shadow-xl relative overflow-hidden bg-white/95 backdrop-blur-md">
        {/* Closed Banner */}
        {isClosed && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Lock className="w-4 h-4 text-rose-600" />
              <span>This poll is closed. Voting has ended.</span>
            </div>
            <span className="text-[11px] uppercase tracking-wider text-rose-700 font-bold bg-rose-100 px-2.5 py-0.5 rounded-full">
              Final Results
            </span>
          </div>
        )}

        {/* Creator Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          <span>
            Created by <strong className="text-slate-800 font-semibold">{poll.creator_name || 'Anonymous'}</strong>
          </span>
          <span className="text-slate-400">Live tallying via Redis</span>
        </div>

        {/* Poll Question */}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 leading-snug">
          {poll.question}
        </h1>

        {poll.description && (
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {poll.description}
          </p>
        )}

        {/* Voted Confirmation Banner */}
        {hasVoted && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your vote has been recorded! Live results are updating in real-time below without refresh.</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 uppercase tracking-wider shrink-0 bg-emerald-100 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Options List Form */}
        <form onSubmit={handleVoteSubmit} className="space-y-3.5 my-6">
          {(poll.options || []).map((opt, index) => {
            const optVotes = opt.votes !== undefined ? opt.votes : opt.vote_count || 0;
            const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
            const isSelected = selectedOptions.includes(opt.id);
            const color = opt.color || OPTION_COLORS[index % OPTION_COLORS.length];

            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl border transition-all ${
                  hasVoted || isClosed
                    ? 'cursor-default border-slate-200/90 bg-white'
                    : isSelected
                    ? 'cursor-pointer border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                    : 'cursor-pointer border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                {/* Background Animated Percentage Bar */}
                {showResults && (
                  <div
                    className="absolute top-0 left-0 bottom-0 opacity-15 transition-all duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                    }}
                  />
                )}

                {/* Option Content */}
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {!isClosed && !hasVoted && (
                      <div
                        className={`w-5 h-5 rounded-${poll.allow_multiple ? 'md' : 'full'} border flex items-center justify-center transition shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    )}

                    {hasVoted && isSelected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-2xs shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Your vote</span>
                      </span>
                    )}

                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {opt.text}
                    </span>
                  </div>

                  {/* Votes Count & Percentage */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-slate-800 font-extrabold text-sm sm:text-base tracking-tight">
                      {optVotes}{' '}
                      <span className="text-xs text-slate-500 font-semibold">
                        {optVotes === 1 ? 'vote' : 'votes'}
                      </span>
                    </span>

                    {showResults && (
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60 min-w-[42px] text-center">
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Submit Action (Only if not voted and not closed) */}
          {!hasVoted && !isClosed && (
            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={submitting || selectedOptions.length === 0}
                className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md shadow-blue-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting Vote...' : 'Submit Your Vote'}</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowBars(!showBars)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition inline-flex items-center gap-1.5"
                >
                  {showBars ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>
                    {showBars
                      ? 'Hide live percentage bars'
                      : 'Audience view: Show live percentage bars'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Poll Metadata Footer */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            {poll.allow_multiple
              ? '☑ Multiple options allowed'
              : '◉ Single vote selection'}
          </span>
          <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            Live Redis Pub/Sub WebSocket
          </span>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        poll={poll}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
}
