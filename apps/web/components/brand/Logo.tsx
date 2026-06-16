/**
 * meva logo — an abstract "layered context" mark: stacked rounded bars
 * (versioned blocks of knowledge) on a brand violet→cyan gradient tile.
 */
export function Logo({ size = 28 }: { size?: number }) {
  const id = "meva-grad";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="meva"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6c4cf0" />
          <stop offset="1" stopColor="#14b8c4" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id})`} />
      {/* stacked "context blocks", offset like a diff / merge */}
      <rect x="8" y="9" width="16" height="3.4" rx="1.7" fill="#ffffff" opacity="0.95" />
      <rect x="8" y="14.3" width="11" height="3.4" rx="1.7" fill="#ffffff" opacity="0.8" />
      <rect x="8" y="19.6" width="14" height="3.4" rx="1.7" fill="#ffffff" opacity="0.65" />
    </svg>
  );
}
