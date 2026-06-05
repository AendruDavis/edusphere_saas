import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "../lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

type ToastOptions = {
  title?: string;
  duration?: number;
};

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  title: string;
};

type ToastApi = {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastApi | undefined>(undefined);

const toastCopy: Record<ToastType, { title: string; className: string; icon: typeof CheckCircle2 }> = {
  success: { title: "Success", className: "text-bg-success", icon: CheckCircle2 },
  error: { title: "Error", className: "text-bg-danger", icon: AlertCircle },
  warning: { title: "Attention", className: "text-bg-warning", icon: AlertCircle },
  info: { title: "Note", className: "text-bg-info", icon: Info },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (type: ToastType, message: string, options?: ToastOptions) => {
      const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const item = {
        id,
        type,
        message,
        title: options?.title || toastCopy[type].title,
      };

      setItems((current) => [item, ...current].slice(0, 5));
      window.setTimeout(() => remove(id), options?.duration ?? 4200);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, options) => show("success", message, options),
      error: (message, options) => show("error", message, options),
      warning: (message, options) => show("warning", message, options),
      info: (message, options) => show("info", message, options),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {items.map((item) => {
          const meta = toastCopy[item.type];
          const Icon = meta.icon;
          return (
            <div key={item.id} className={cn("toast show", meta.className)} role="status">
              <div className="toast-header">
                <Icon className="h-4 w-4" />
                <strong>{item.title}</strong>
                <button type="button" className="toast-close" aria-label="Close notification" onClick={() => remove(item.id)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="toast-body">{item.message}</div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
