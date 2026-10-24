// Icon set from the design system: 24px grid, 1.8 stroke, rounded caps.
// Inline SVG paths keep every icon in the JS bundle with no extra requests.
const paths = {
  alert: "M12 3.5 2.5 20h19zM12 10v4.5M12 17.5h.01",
  bank: "M3 9.5h18M12 3l9 5H3zM5.5 10v7.5M10 10v7.5M14 10v7.5M18.5 10v7.5M3 20.5h18",
  bell: "M6 9a6 6 0 1 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9zM10 20.5a2.2 2.2 0 0 0 4 0",
  cal: "M4 5.5h16V20H4zM4 10h16M8.5 3v4M15.5 3v4",
  camera: "M3 8h4l2-3h6l2 3h4v12H3zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z",
  chat: "M20.5 12a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.1-4.4A8.5 8.5 0 1 1 20.5 12z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  church: "M3 21h18M5 21V10l7-6 7 6v11M10 21v-4a2 2 0 0 1 4 0v4M12 7v3M10.5 8.5h3",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM12 7.5V12l3 2",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  data: "M5 20v-4M10 20v-8M15 20V8M20 20V4",
  down: "M6 9l6 6 6-6",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z",
  file: "M14 3H6v18h12V7zM14 3v4h4",
  globe:
    "M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM3 12h18M12 3c2.4 2.5 3.5 5.5 3.5 9s-1.1 6.5-3.5 9c-2.4-2.5-3.5-5.5-3.5-9S9.6 5.5 12 3",
  grid: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z",
  history: "M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 3.5v5h5M12 8v4l3 2",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM12 11v5M12 7.5h.01",
  left: "M15 6l-6 6 6 6",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14",
  mega: "M3 10v4M6 9.5v5l12 5.5V4zM7 14.8 8.5 20h3l-1.3-4.3",
  mobile: "M7 2.5h10v19H7zM11 18h2",
  music: "M9 18V5.5l11-2V16M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  nav: "M3 11 21 3l-8 18-2-8z",
  off: "M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4.5-2.7M19 13a10 10 0 0 0-2.5-1.8M2 9a15 15 0 0 1 4.3-2.8M22 9a15 15 0 0 0-11-3.9M12 20h.01",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5z",
  plus: "M12 5v14M5 12h14",
  refresh: "M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5",
  right: "M9 6l6 6-6 6",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14zM20 20l-4-4",
  send: "M21 3 10 14M21 3l-6.5 18-4-7.5L3 9.5z",
  share:
    "M18 4a3 3 0 1 0 0 6 3 3 0 1 0 0-6zM6 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6zM18 14a3 3 0 1 0 0 6 3 3 0 1 0 0-6zM8.6 13.5l6.8 3.9M15.4 6.6l-6.8 3.9",
  shield: "M12 3 4.5 6v6c0 4.8 3.3 7.8 7.5 9 4.2-1.2 7.5-4.2 7.5-9V6zM9 12l2.2 2.2L15.5 10",
  swap: "M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4",
  target:
    "M12 4a8 8 0 1 0 0 16 8 8 0 1 0 0-16zM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6zM12 1.5V4M12 20v2.5M1.5 12H4M20 12h2.5",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  upload: "M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v5h16v-5",
  user: "M12 4a4.5 4.5 0 1 0 0 9 4.5 4.5 0 1 0 0-9zM4 21a8 8 0 0 1 16 0",
  users:
    "M9.5 4a4 4 0 1 0 0 8 4 4 0 1 0 0-8zM2.5 20a7 7 0 0 1 14 0M16 4.3a4 4 0 0 1 0 7.4M21.5 20a7 7 0 0 0-3.5-6",
  verified:
    "M12 3l2.2 1.6 2.7-.1.8 2.6 2.2 1.6-.9 2.6.9 2.6-2.2 1.6-.8 2.6-2.7-.1L12 21l-2.2-1.6-2.7.1-.8-2.6-2.2-1.6.9-2.6-.9-2.6 2.2-1.6.8-2.6 2.7.1zM8.8 12.2l2.2 2.2 4.2-4.6",
  x: "M6 6l12 12M18 6 6 18",
} as const;

export type IconName = keyof typeof paths;

/** Dot-style icons (more, grip) need a heavier stroke to read as dots. */
const DOT_ICONS: ReadonlySet<IconName> = new Set(["more", "grip"]);

interface IconProps {
  name: IconName;
  /** 22 by default; 18 for small, 14 inside badges. */
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** Gives the icon an accessible name; otherwise it's hidden from screen readers. */
  label?: string;
}

export function Icon({ name, size = 22, className, strokeWidth, label }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? (DOT_ICONS.has(name) ? 3.2 : 1.8)}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className ?? ""}`}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <path d={paths[name]} />
    </svg>
  );
}
