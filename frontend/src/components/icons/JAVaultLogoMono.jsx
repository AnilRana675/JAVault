import React from 'react';

// Monochrome mark that inherits currentColor
export default function JAVaultLogoMono({ size = 24, className = '', title = 'JAVault Mono' }) {
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
      {/* Rounded square background */}
      <rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor" opacity="0.18" />
      {/* Vault ring */}
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
      {/* Play */}
      <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="currentColor" opacity="0.95" />
      {/* Spindle ticks */}
      <circle cx="7.5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
      <circle cx="16.5" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
