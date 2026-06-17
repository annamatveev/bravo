/**
 * bravo logo — a "brain vault": a brain silhouette wired with circuit traces
 * and node pads, suggesting governed, connected knowledge. Line art in the
 * current text color (themes); node rings are masked with the surface color.
 */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center text-brand"
      style={{ width: size, height: size }}
      aria-label="bravo"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* brain outline */}
        <path
          strokeWidth="2.6"
          d="M24 9.5C21.5 6 17.5 5.2 15 7C11.5 5.5 8 7.5 7.6 11.4C4.6 12.6 3.6 16.4 5.8 19.2C3.8 22 4.4 26 6.9 27.8C5.4 31 7.2 34.8 11 35.8C12 39.6 16 41.6 19.8 40.6C21.2 42.4 24 42.2 24 39.4C24 42.2 26.8 42.4 28.2 40.6C32 41.6 36 39.6 37 35.8C40.8 34.8 42.6 31 41.1 27.8C43.6 26 44.2 22 42.2 19.2C44.4 16.4 43.4 12.6 40.4 11.4C40 7.5 36.5 5.5 33 7C30.5 5.2 26.5 6 24 9.5Z"
        />
        {/* hemisphere groove */}
        <path strokeWidth="2" d="M24 10.5C22.6 15 25.4 19 24 23.5C22.6 28 25 33 24 39" />
        {/* circuit traces */}
        <path strokeWidth="2" d="M24 18H18.5V15" />
        <path strokeWidth="2" d="M24 26.5H15.5V29.5" />
        <path strokeWidth="2" d="M24 18H29.5V15" />
        <path strokeWidth="2" d="M24 26.5H32.5V29.5" />
        {/* node pads */}
        <circle cx="18.5" cy="13" r="2.1" strokeWidth="2" fill="var(--surface)" />
        <circle cx="15.5" cy="31.4" r="2.1" strokeWidth="2" fill="var(--surface)" />
        <circle cx="29.5" cy="13" r="2.1" strokeWidth="2" fill="var(--surface)" />
        <circle cx="32.5" cy="31.4" r="2.1" strokeWidth="2" fill="var(--surface)" />
      </svg>
    </span>
  );
}
