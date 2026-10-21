import type { ReactNode } from "react";

/*
 * Phone-first page frame: sticky top bar, scrolling content, optional sticky
 * footer (actions) and bottom navigation. Centred at 480px on wider screens.
 */
export function Screen({
  top,
  banner,
  children,
  footer,
  nav,
  className = "",
  contentClassName = "",
}: {
  top?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  nav?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={`mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-canvas ${className}`}>
      {(top || banner) && (
        <div className="sticky top-0 z-20 bg-canvas">
          {top}
          {banner}
        </div>
      )}
      <main className={`flex flex-1 flex-col gap-3.5 px-4 pt-1 pb-4 ${contentClassName}`}>
        {children}
      </main>
      {footer && (
        <div className="sticky bottom-0 z-20 flex flex-col gap-1.5 border-t border-line bg-canvas px-4 pt-3 pb-[18px]">
          {footer}
        </div>
      )}
      {nav}
    </div>
  );
}

export function TopBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <header className={`flex min-h-14 items-center gap-1 px-2 py-2 ${className}`}>{children}</header>
  );
}

/** Large page title used on top-level tabs ("Churches", "Me"). */
export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="t-title min-w-0 flex-1 pl-2">{children}</h1>;
}
