import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Clock, CheckSquare, Sparkles, HelpCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';

export default function CreatePoll() {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [expiresInMins, setExpiresInMins] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleAddOption = () => {
    if (options.length >= 10) {
      setError('A poll can have at most 10 options');
      return;
    }
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      setError('A poll must have at least 2 options');
      return;
    }
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
  };

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (question.trim().length < 5) {
      setError('Question must be at least 5 characters long');
      return;
    }

    const cleanOptions = options.map(o => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError('Please provide at least 2 non-empty options');
      return;
    }

    const uniqueSet = new Set(cleanOptions.map(o => o.toLowerCase()));
    if (uniqueSet.size !== cleanOptions.length) {
      setError('All options must be unique');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createPoll({
        question: question.trim(),
        description: description.trim(),
        options: cleanOptions.map(text => ({ text })),
        allow_multiple: allowMultiple,
        expires_in_mins: Number(expiresInMins),
      });

      // Navigate to live results screen immediately
      navigate(`/poll/${res.poll.id}/results?new=true`);
    } catch (err) {
      setError(err.message || 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto 5rem auto', padding: '0 1.5rem' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn-secondary"
        style={{ marginBottom: '1.5rem', padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <Sparkles size={16} />
            <span>POLL BUILDER</span>
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Create a New Live Poll</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Audience members will be able to vote in real-time via shareable link or scannable QR code.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem',
            color: '#fda4af',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Question Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Poll Question <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Which backend framework should we use for the next project?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="input-field"
              style={{ fontSize: '1.05rem', padding: '0.9rem 1.1rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.35rem', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
              {question.length}/250 characters
            </div>
          </div>

          {/* Optional Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Description / Context <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Add extra context or instructions for your voters..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Options List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                Voting Options <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {options.length}/10 options
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="input-field"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="btn-danger"
                      style={{ padding: '0.65rem' }}
                      title="Remove option"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="btn-secondary"
                style={{ marginTop: '0.85rem', padding: '0.55rem 1rem', fontSize: '0.85rem' }}
              >
                <Plus size={16} />
                <span>Add Another Option</span>
              </button>
            )}
          </div>

          {/* Advanced Settings */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            {/* Multiple Choice Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <CheckSquare size={18} color="var(--accent-primary)" />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Allow Multiple Selections</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Voters can choose more than one option</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </label>

            {/* Expiry Selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Clock size={18} color="var(--accent-primary)" />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Poll Expiration</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Automatically close voting after time elapses</div>
                </div>
              </div>
              <select
                value={expiresInMins}
                onChange={(e) => setExpiresInMins(e.target.value)}
                className="input-field"
                style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                <option value={0}>Never expires (Manual)</option>
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={60}>1 hour</option>
                <option value={1440}>24 hours</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ padding: '1rem', fontSize: '1.05rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Creating Poll...' : 'Launch Live Poll 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}
