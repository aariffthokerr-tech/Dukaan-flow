import React from 'react';

interface BrandLogoProps {
  inverted?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ inverted = false }) => {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="26"
        height="26"
        viewBox="0 0 512 512"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          width="512"
          height="512"
          rx="112"
          fill={inverted ? '#FFFFFF' : '#111315'}
        />
        <path
          d="M148 164C148 148.536 160.536 136 176 136H252C322.692 136 376 186.144 376 256C376 325.856 322.692 376 252 376H176C160.536 376 148 363.464 148 348V164Z"
          stroke={inverted ? '#111315' : '#FFFFFF'}
          strokeWidth="34"
          strokeLinejoin="round"
        />
        <path
          d="M216 208H256C286.928 208 308 228.5 308 256C308 283.5 286.928 304 256 304H216V208Z"
          fill="#15803D"
        />
      </svg>
      <span
        className={`font-display text-lg font-bold tracking-tight ${
          inverted ? 'text-white' : 'text-neutral-900'
        }`}
      >
        DukaanFlow
      </span>
    </span>
  );
};
