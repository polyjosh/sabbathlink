/**
 * The SabbathLink mark: a sun rising over two linked rings. At 32px and
 * below the rays are dropped, as the design system specifies.
 */
export function LogoMark({ size = 40, label }: { size?: number; label?: string }) {
  const rays = size > 32;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className="shrink-0"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <rect width="40" height="40" rx="11" className="fill-header" />
      <path d="M12.5 23a7.5 7.5 0 0 1 15 0z" className="fill-accent" />
      {rays && (
        <path
          d="M20 9.5v2.6M11 13.2l1.8 1.8M29 13.2 27.2 15"
          fill="none"
          className="stroke-accent"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
      <rect x="6.5" y="24.5" width="15" height="7" rx="3.5" fill="none" stroke="#fff" strokeWidth="2" />
      <rect x="18.5" y="24.5" width="15" height="7" rx="3.5" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

/** "Sabbath" in ink, "Link" in primary. Never uses denomination names. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-[-0.02em] text-ink ${className}`}>
      Sabbath<span className="text-primary">Link</span>
    </span>
  );
}
