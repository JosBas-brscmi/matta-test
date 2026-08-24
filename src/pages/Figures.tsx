import React from 'react';

export function Figure({ code }: { code?: string }) {
  if (!code) return null;

  if (code === 'svg:pattern1') {
    return (
      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <svg viewBox="0 0 400 120" className="w-full h-24">
          <g fill="none" stroke="currentColor" strokeWidth="3" opacity="0.9">
            <rect x="20" y="20" width="70" height="70" rx="10" />
            <path d="M55 30 v50" />
            <rect x="120" y="20" width="70" height="70" rx="10" />
            <path d="M135 55 h50" />
            <rect x="220" y="20" width="70" height="70" rx="10" />
            <path d="M255 30 v50" />
            <rect x="320" y="20" width="70" height="70" rx="10" opacity="0.35" />
          </g>
          <text x="333" y="112" fontSize="12" fill="currentColor" opacity="0.65">?</text>
        </svg>
        <div className="text-xs text-muted mt-2">Demo figure (replace with your own licensed figures).</div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-muted">
      Figure placeholder: {code}
    </div>
  );
}
