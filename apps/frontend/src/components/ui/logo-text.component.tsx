import React from 'react';

export const LogoTextComponent = () => {
  return (
    <svg
      width="120"
      height="40"
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Trail dots */}
      <circle cx="6"  cy="24" r="5"  fill="#7C5CFC" fillOpacity="0.08" />
      <circle cx="15" cy="17" r="6.5" fill="#7C5CFC" fillOpacity="0.18" />
      {/* Agent dot */}
      <circle cx="27" cy="9"  r="10" fill="#7C5CFC" />
      {/* Eye */}
      <circle cx="27" cy="9"  r="3.8" fill="white" />
      {/* Wordmark */}
      <text
        x="44"
        y="28"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="24"
        fontWeight="600"
        fill="currentColor"
        letterSpacing="-1"
      >
        mav
      </text>
    </svg>
  );
};
