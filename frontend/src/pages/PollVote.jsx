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

    const fetchPoll = async (silent = false) => {
      try {
        const res = await api.getPoll(id);
        setPoll(res.poll);
      } catch (err) {
        if (!silent) setError(err.message || 'Poll not found or inactive');
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchPoll(false);

    // Silent background sync check every 4s for status changes without reloading
    const syncInterval = setInterval(() => {
      fetchPoll(true);
    }, 4000);

    return () => clearInterval(syncInterval);
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
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', background: '#ffffff' }}>
          <AlertCircle size={44} color="#e11d48" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Poll Unavailable</h2>
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
      <div className="glass-panel animate-fade-in" style={{ padding: '2.25rem', background: '#ffffff' }}>
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
              <span style={{
                padding: '0.2rem 0.65rem',
                fontSize: '0.78rem',
                color: '#b91c1c',
                background: '#fee2e2',
                borderRadius: '9999px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}>
                <Lock size={12} />
                <span>POLL CLOSED</span>
              </span>
            )}
            {poll.allow_multiple && (
              <span style={{
                fontSize: '0.75rem',
                background: '#f1f5f9',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                color: 'var(--text-muted)',
                fontWeight: 500,
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
        <h1 style={{ fontSize: '1.65rem', marginBottom: '0.5rem', lineHeight: 1.3, color: 'var(--text-main)' }}>
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
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '14px',
            padding: '1rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#047857' }}>
              <CheckCircle2 size={20} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Your vote has been counted!</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { setAlreadyVoted(false); setSelectedOptions([]); }}
                className="btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
              >
                Vote Again / Change
              </button>
              <Link to={`/poll/${id}/results`} className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
                View Results Live
              </Link>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '12px',
            padding: '0.8rem 1rem',
            marginBottom: '1.25rem',
            color: '#be123c',
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
                      ? '#eef2ff' 
                      : '#ffffff',
                    border: (isSelected || isPastSelected)
                      ? '2px solid var(--accent-primary)'
                      : '1px solid var(--border-subtle)',
                    cursor: (alreadyVoted || !poll.is_active) ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'all 0.2s ease',
                    boxShadow: (isSelected || isPastSelected) ? '0 4px 14px rgba(79, 70, 229, 0.12)' : '0 1px 3px rgba(15, 23, 42, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: poll.allow_multiple ? '6px' : '50%',
                      background: (isSelected || isPastSelected) ? 'var(--accent-primary)' : '#f1f5f9',
                      border: `1.5px solid ${(isSelected || isPastSelected) ? 'var(--accent-primary)' : '#cbd5e1'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {(isSelected || isPastSelected) && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: (isSelected || isPastSelected) ? 600 : 500, color: 'var(--text-main)' }}>
                      {option.text}
                    </span>
                  </div>

                  {isPastSelected && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600, background: '#e0e7ff', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>Your Choice</span>
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
