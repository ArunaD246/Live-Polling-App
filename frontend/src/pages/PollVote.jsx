import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CheckCircle2, Circle, AlertCircle, BarChart2, Radio, Check, Lock } from 'lucide-react';
import { api, hasDeviceVoted, markDeviceVoted, getDeviceVoteRecord } from '../services/api';

export default function PollVote() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [pastSelection, setPastSelection] = useState(null);

  useEffect(() => {
    // Check local device storage
    if (hasDeviceVoted(id)) {
      setAlreadyVoted(true);
      const rec = getDeviceVoteRecord(id);
      if (rec) setPastSelection(rec.optionIds);
    }

    const fetchPoll = async () => {
      try {
        const res = await api.getPoll(id);
        setPoll(res.poll);
      } catch (err) {
        setError(err.message || 'Poll not found or inactive');
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [id]);

  const toggleOption = (optionId) => {
    if (alreadyVoted || !poll?.is_active) return;

    if (poll.allow_multiple) {
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions(selectedOptions.filter(o => o !== optionId));
      } else {
        setSelectedOptions([...selectedOptions, optionId]);
      }
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedOptions.length === 0) {
      setError('Please choose at least one option to vote');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.castVote(id, selectedOptions);
      markDeviceVoted(id, selectedOptions);

      // Celebration Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      setAlreadyVoted(true);
      setPastSelection(selectedOptions);

      // Smooth delay before redirecting to live results
      setTimeout(() => {
        navigate(`/poll/${id}/results?voted=true`);
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to submit vote');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '600px', margin: '6rem auto', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Loading poll details...</p>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div style={{ maxWidth: '540px', margin: '4rem auto', padding: '0 1.5rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <AlertCircle size={44} color="#f43f5e" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Poll Unavailable</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error}</p>
          <Link to="/" className="btn-secondary">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '2.5rem auto 5rem auto', padding: '0 1.5rem' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '2.25rem' }}>
        {/* Status Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {poll.is_active ? (
              <span className="badge-live">
                <span className="pulse-dot"></span>
                <span>VOTING OPEN</span>
              </span>
            ) : (
              <span className="btn-secondary" style={{ padding: '0.2rem 0.65rem', fontSize: '0.78rem', color: '#fda4af' }}>
                <Lock size={12} />
                <span>POLL CLOSED</span>
              </span>
            )}
            {poll.allow_multiple && (
              <span style={{
                fontSize: '0.75rem',
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                color: 'var(--text-muted)'
              }}>
                Select Multiple
              </span>
            )}
          </div>

          <Link
            to={`/poll/${id}/results`}
            style={{
              fontSize: '0.82rem',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 600,
            }}
          >
            <BarChart2 size={14} />
            <span>Live Results</span>
          </Link>
        </div>

        {/* Question */}
        <h1 style={{ fontSize: '1.65rem', marginBottom: '0.5rem', lineHeight: 1.3 }}>
          {poll.question}
        </h1>

        {poll.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.75rem' }}>
            {poll.description}
          </p>
        )}

        {/* Already Voted Banner */}
        {alreadyVoted && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '14px',
            padding: '1rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#34d399' }}>
              <CheckCircle2 size={20} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Your vote has been counted!</span>
            </div>
            <Link to={`/poll/${id}/results`} className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
              View Results Live
            </Link>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '12px',
            padding: '0.8rem 1rem',
            marginBottom: '1.25rem',
            color: '#fda4af',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Option Selection List */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.75rem' }}>
            {poll.options?.map((option) => {
              const isSelected = selectedOptions.includes(option.id);
              const isPastSelected = pastSelection?.includes(option.id);

              return (
                <div
                  key={option.id}
                  onClick={() => toggleOption(option.id)}
                  style={{
                    padding: '1.1rem 1.25rem',
                    borderRadius: '14px',
                    background: (isSelected || isPastSelected) 
                      ? 'rgba(99, 102, 241, 0.18)' 
                      : 'rgba(255, 255, 255, 0.03)',
                    border: (isSelected || isPastSelected)
                      ? '1.5px solid var(--accent-primary)'
                      : '1px solid var(--border-subtle)',
                    cursor: (alreadyVoted || !poll.is_active) ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'all 0.2s ease',
                    boxShadow: (isSelected || isPastSelected) ? '0 0 15px rgba(99, 102, 241, 0.25)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: poll.allow_multiple ? '6px' : '50%',
                      background: (isSelected || isPastSelected) ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {(isSelected || isPastSelected) && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: (isSelected || isPastSelected) ? 600 : 500 }}>
                      {option.text}
                    </span>
                  </div>

                  {isPastSelected && (
                    <span style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 600 }}>Your Choice</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Button */}
          {!alreadyVoted && poll.is_active && (
            <button
              type="submit"
              disabled={submitting || selectedOptions.length === 0}
              className="btn-primary"
              style={{ width: '100%', padding: '0.95rem', fontSize: '1rem' }}
            >
              {submitting ? 'Submitting Vote...' : `Cast Your Vote ${selectedOptions.length > 0 ? `(${selectedOptions.length} Selected)` : ''}`}
            </button>
          )}

          {!poll.is_active && !alreadyVoted && (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Voting has ended for this poll. You can inspect the final live results below.
            </div>
          )}
        </form>

        <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
          <Link
            to={`/poll/${id}/results`}
            className="btn-secondary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
          >
            <BarChart2 size={16} />
            <span>Watch Live Results Stream</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
