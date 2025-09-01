import React, { useId } from 'react';

export default function JAVaultLogoOutline({ size = 24, className = '', title = 'JAVault Outline', strokeWidth = 1.6 }) {
  const gradId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="50%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      {/* Rounded square */}
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="none" stroke={`url(#${gradId})`} strokeWidth={strokeWidth} />
      {/* Vault ring */}
      <circle cx="12" cy="12" r="6.5" fill="none" stroke={`url(#${gradId})`} strokeWidth={strokeWidth} opacity="0.85" />
      {/* Play */}
      <path d="M10 8.7L15.2 12L10 15.3V8.7Z" fill="none" stroke={`url(#${gradId})`} strokeWidth={strokeWidth} strokeLinejoin="round" />
      {/* Spindle ticks */}
      <circle cx="7.5" cy="12" r="0.9" fill={`url(#${gradId})`} />
      <circle cx="12" cy="7.5" r="0.9" fill={`url(#${gradId})`} />
      <circle cx="12" cy="16.5" r="0.9" fill={`url(#${gradId})`} />
      <circle cx="16.5" cy="12" r="0.9" fill={`url(#${gradId})`} />
    </svg>
  );
}
