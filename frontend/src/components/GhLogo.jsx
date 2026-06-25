import React from 'react';

// Octopush logo - friendly octopus mark
const GhLogo = ({ className = 'h-8 w-8' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="oct-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(var(--brand))" />
        <stop offset="100%" stopColor="hsl(var(--brand-2))" />
      </linearGradient>
    </defs>
    {/* Head */}
    <ellipse cx="32" cy="24" rx="18" ry="16" fill="url(#oct-grad)" />
    {/* Tentacles */}
    <path d="M14 30 Q 8 42 14 52 Q 18 46 16 38 Z" fill="url(#oct-grad)" />
    <path d="M22 36 Q 18 50 24 56 Q 26 48 24 40 Z" fill="url(#oct-grad)" />
    <path d="M32 38 Q 32 52 32 58 Q 34 50 34 40 Z" fill="url(#oct-grad)" />
    <path d="M42 36 Q 46 50 40 56 Q 38 48 40 40 Z" fill="url(#oct-grad)" />
    <path d="M50 30 Q 56 42 50 52 Q 46 46 48 38 Z" fill="url(#oct-grad)" />
    {/* Eyes */}
    <circle cx="26" cy="22" r="3.2" fill="#0a0a0a" />
    <circle cx="38" cy="22" r="3.2" fill="#0a0a0a" />
    <circle cx="27" cy="21" r="1" fill="#fff" />
    <circle cx="39" cy="21" r="1" fill="#fff" />
    {/* Smile */}
    <path d="M28 30 Q 32 33 36 30" stroke="#0a0a0a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

export default GhLogo;
