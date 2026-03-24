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
      {/* Trail dots */}
      <circle cx="140" cy="360" r="55" fill="white" fillOpacity="0.1" />
      <circle cx="224" cy="285" r="68" fill="white" fillOpacity="0.2" />
      {/* Agent dot */}
      <circle cx="338" cy="182" r="100" fill="white" />
      {/* Eye */}
      <circle cx="338" cy="182" r="38" fill="#7C5CFC" />
    </svg>
  );
};
