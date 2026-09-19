import React from 'react';

export default function ConnectionStatus({ status = 'connected' }) {
  if (status === 'connected') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wide shadow-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        LIVE UPDATES ACTIVE
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold tracking-wide shadow-xs">
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
        CONNECTING REALTIME...
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold tracking-wide shadow-xs">
      <span className="h-2 w-2 rounded-full bg-slate-400"></span>
      POLLING FALLBACK
    </div>
  );
}
