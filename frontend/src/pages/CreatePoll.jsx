import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  Sliders,
  Radio,
  Square,
  Check,
} from 'lucide-react';
import { api } from '../services/api';

export default function CreatePoll() {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  // Manage options
  const handleAddOption = () => {
    if (options.length < 8) {
      setOptions([...options, '']);
    }
  };

  const handleUpdateOption = (index, value) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, idx) => idx !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanQuestion = question.trim();
    if (cleanQuestion.length < 5) {
      setError('Question must be at least 5 characters long.');
      return;
    }

    const cleanOptions = options.map((opt) => opt.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError('Please fill in at least 2 options.');
      return;
    }

    // Check for duplicate options
    const uniqueOptions = new Set(cleanOptions.map((o) => o.toLowerCase()));
    if (uniqueOptions.size !== cleanOptions.length) {
      setError('Each option text must be unique.');
      return;
    }

    setLoading(true);

    try {
      const expiresInMins = parseInt(expiresInHours, 10) * 60;
      const formattedOptions = cleanOptions.map((text) => ({ text }));

      const payload = {
        question: cleanQuestion,
        description: description.trim(),
        options: formattedOptions,
        allow_multiple: allowMultiple,
        expires_in_mins: expiresInMins,
      };

      const res = await api.createPoll(payload);
      const poll = res.poll || res.data || res;
      const pollId = poll.slug || poll.id || poll._id;
      navigate(`/poll/${pollId}`);
    } catch (err) {
      console.error('Create poll error:', err);
      setError(err.message || 'Failed to create poll. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 50%, #f8fbff 100%)',
      }}
    >
      {/* Background Dot Pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #bfdbfe 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.25,
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl bg-white border border-blue-100 text-slate-500 hover:text-blue-600 hover:border-blue-300 transition shadow-xs"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create a Live Poll</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Set up your question, options, and share with your audience instantly
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Column Grid: Left Form, Right Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Column */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-5">
            {/* Card 1: Question & Description */}
            <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Poll Question *
                </label>
                <input
                  type="text"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What should we build next in our roadmap?"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Description / Context (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any instructions, background details, or notes for your voters..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"
                />
              </div>
            </div>

            {/* Card 2: Options Builder */}
            <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Poll Options *
                  </h3>
                  <p className="text-[11px] text-slate-400">Add 2 to 8 choices for your voters</p>
                </div>
                <span className="text-xs font-bold text-slate-500">{options.length}/8</span>
              </div>

              <div className="space-y-3">
                {options.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => handleUpdateOption(index, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                        title="Remove Option"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 8 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 text-blue-600 hover:bg-blue-50/50 text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Option</span>
                </button>
              )}
            </div>

            {/* Card 3: Settings */}
            <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Poll Settings</span>
              </h3>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label htmlFor="multi-toggle" className="text-xs font-bold text-slate-900 block cursor-pointer">
                    Allow Multiple Selections
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Voters can choose more than one option
                  </span>
                </div>
                <input
                  id="multi-toggle"
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label htmlFor="duration-select" className="text-xs font-bold text-slate-900 block">
                    Poll Duration / Auto-Close
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Automatically close poll after specified time
                  </span>
                </div>
                <select
                  id="duration-select"
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="0">No limit (Manual)</option>
                  <option value="1">1 Hour</option>
                  <option value="6">6 Hours</option>
                  <option value="24">24 Hours</option>
                  <option value="168">7 Days</option>
                </select>
              </div>
            </div>

            {/* Launch Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md shadow-blue-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Publishing Live Poll...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Live Poll</span>
                </>
              )}
            </button>
          </form>

          {/* Right Column: Dynamic Live Preview */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="bg-white rounded-3xl border border-blue-100 shadow-xl shadow-blue-100/50 p-6 sm:p-7">
              {/* Preview Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Live Preview
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                  Open Poll
                </span>
              </div>

              {/* Preview Question */}
              <h2 className="text-lg font-black text-slate-900 mb-2 leading-snug">
                {question.trim() || 'Your poll question will appear here...'}
              </h2>

              {description.trim() && (
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  {description.trim()}
                </p>
              )}

              {/* Preview Options */}
              <div className="space-y-2.5 my-4">
                {options.map((opt, idx) => {
                  const label = String.fromCharCode(65 + idx);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center gap-3 transition"
                    >
                      <div className="w-5 h-5 rounded-md border border-slate-300 bg-white flex items-center justify-center shrink-0">
                        {allowMultiple ? (
                          <Square className="w-3 h-3 text-slate-300" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {opt.trim() || `Option ${label}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Preview Settings Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{allowMultiple ? '☑ Multiple votes allowed' : '◉ Single vote selection'}</span>
                {expiresInHours !== '0' && (
                  <span className="flex items-center gap-1 text-amber-600 font-semibold">
                    <Clock className="w-3 h-3" />
                    Auto-closes in {expiresInHours}h
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
