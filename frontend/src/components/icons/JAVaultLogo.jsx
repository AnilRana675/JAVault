import React, { useId } from 'react';

/**
 * JAVaultLogo - Custom SVG icon for the website
 * Props:
 * - size: number (px) default 24
 * - className: string for Tailwind/CSS classes
 * - title: accessible title for screen readers
 */
export default function JAVaultLogo({ size = 24, className = '', title = 'JAVault' }) {
  const gradientId = useId();
  const maskId = useId();

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
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="50%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="white" />
          <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="white" />
          <circle cx="7.5" cy="12" r="0.9" fill="white" />
          <circle cx="12" cy="7.5" r="0.9" fill="white" />
          <circle cx="12" cy="16.5" r="0.9" fill="white" />
          <circle cx="16.5" cy="12" r="0.9" fill="white" />
        </mask>
      </defs>

      <rect x="2" y="2" width="20" height="20" rx="5" fill={`url(#${gradientId})`} opacity="0.95" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="white" strokeOpacity="0.65" strokeWidth="1.5" />
      <g mask={`url(#${maskId})`}>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#FFFFFF" opacity="0.08" />
      </g>
      <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="#FFFFFF" fillOpacity="0.9" />
      <circle cx="7.5" cy="12" r="0.9" fill="#FFFFFF" opacity="0.9" />
      <circle cx="12" cy="7.5" r="0.9" fill="#FFFFFF" opacity="0.9" />
      <circle cx="12" cy="16.5" r="0.9" fill="#FFFFFF" opacity="0.9" />
      <circle cx="16.5" cy="12" r="0.9" fill="#FFFFFF" opacity="0.9" />
      <path d="M6 6 C9 4.5, 12 4.2, 14 5" fill="none" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
