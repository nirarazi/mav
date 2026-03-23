'use client';

export const Logo = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="60"
      height="60"
      viewBox="0 0 512 512"
      fill="none"
      className="mt-[8px] min-w-[60px] min-h-[60px]"
    >
      <rect width="512" height="512" rx="112" fill="#7C5CFC" />
      {/* Outer orbit arc */}
      <path
        d="M 369.5 189.1 A 163.8 163.8 0 1 1 147.7 333.7"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="17.9"
        strokeLinecap="round"
      />
      {/* Inner orbit arc */}
      <path
        d="M 170.1 333.1 A 102.4 102.4 0 1 1 339.1 230.7"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="12.8"
        strokeLinecap="round"
      />
      {/* Primary agent node */}
      <circle cx="369.5" cy="189.1" r="35.8" fill="white" />
      {/* Secondary agent node */}
      <circle cx="170.1" cy="333.1" r="21.5" fill="rgba(255,255,255,0.7)" />
      {/* Center point */}
      <circle cx="256" cy="256" r="15.4" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
};
