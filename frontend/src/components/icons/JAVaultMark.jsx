import React, { useId } from 'react';

export default function JAVaultMark({ size = 24, className = '', title = 'JAVault Mark' }) {
  const grad = useId();
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
        <radialGradient id={grad} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="55%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#06B6D4" />
        </radialGradient>
      </defs>
      {/* Badge */}
      <circle cx="12" cy="12" r="10" fill={`url(#${grad})`} />
      {/* Inner ring */}
      <circle cx="12" cy="12" r="6.7" fill="none" stroke="#FFFFFF" strokeOpacity="0.65" strokeWidth="1.5" />
      {/* Play */}
      <path d="M10.2 9L15 12L10.2 15V9Z" fill="#FFFFFF" />
      {/* Sparkle */}
      <path d="M7.2 6.5 C9 5.4, 10.8 5.2, 12 5.6" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
