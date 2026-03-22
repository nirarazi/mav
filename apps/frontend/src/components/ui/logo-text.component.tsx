import React from 'react';

export const LogoTextComponent = () => {
  return (
    <svg
      width="160"
      height="40"
      viewBox="0 0 160 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Icon */}
      <rect width="32" height="32" x="2" y="4" rx="8" fill="#f97316" />
      <path
        d="M10 28V12l5 10 5-10v16"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M22 28V12l4 8 4-8v16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Text */}
      <text
        x="42"
        y="28"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="22"
        fontWeight="700"
        fill="currentColor"
        letterSpacing="-0.5"
      >
        maverick
      </text>
    </svg>
  );
};
