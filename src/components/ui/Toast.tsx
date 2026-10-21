"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

interface ToastState {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<(t: Omit<ToastState, "id">) => void>(() => {});

/** "Paybill 908712 copied" pill, and the Undo snackbar in the editor. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((t: Omit<ToastState, "id">) => {
    clearTimeout(timer.current);
    setToast({ ...t, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), t.action ? 6000 : 2500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-3"
      >
        {toast &&
          (toast.action ? (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-[456px] items-center gap-2 rounded-xl bg-toast py-1.5 pr-1.5 pl-4 text-sm text-on-toast shadow-[0_8px_20px_rgba(22,37,42,.25)]"
            >
              <span className="min-w-0 flex-1">{toast.message}</span>
              <button
                type="button"
                className="min-h-11 cursor-pointer px-3 text-[15px] font-bold text-accent"
                onClick={() => {
                  toast.action?.onClick();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            </div>
          ) : (
            <div
              key={toast.id}
              role="status"
              className="flex items-center gap-2 rounded-full bg-toast px-[18px] py-3 text-sm font-semibold text-on-toast shadow-[0_8px_20px_rgba(22,37,42,.25)]"
            >
              <Icon name="check" size={18} />
              {toast.message}
            </div>
          ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
