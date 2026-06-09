"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastItem = {
  id: string;
  title: string;
  variant?: "success" | "error" | "info";
};

type ToastContextValue = {
  push: (toast: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const dismissAfterMs = 3200;

  const push = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, ...toast }]);

    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
      timeoutRefs.current.delete(id);
    }, dismissAfterMs);
    timeoutRefs.current.set(id, timeoutId);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-3 text-sm shadow-lg ${
              toast.variant === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                : toast.variant === "error"
                ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                : "border-indigo-500/40 bg-indigo-500/10 text-slate-100"
            }`}
            onMouseEnter={() => {
              const timeoutId = timeoutRefs.current.get(toast.id);
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutRefs.current.delete(toast.id);
              }
            }}
            onMouseLeave={() => {
              if (timeoutRefs.current.has(toast.id)) return;
              const timeoutId = setTimeout(() => {
                setToasts((prev) => prev.filter((item) => item.id !== toast.id));
                timeoutRefs.current.delete(toast.id);
              }, 2000);
              timeoutRefs.current.set(toast.id, timeoutId);
            }}
          >
            {toast.title}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
