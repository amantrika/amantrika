"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Marigold } from "../motifs";

/** Modal, Drawer, Tooltip and Toast — all token-styled overlays. */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button aria-label="Close" className="absolute inset-0 bg-overlay cursor-pointer" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            className={`relative ${wide ? "max-w-4xl" : "max-w-lg"} w-full max-h-[88vh] overflow-y-auto rounded-card bg-surface p-6 shadow-lifted ornate-border`}
            initial={{ y: 24, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              {title && <h2 className="type-h2">{title}</h2>}
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="rounded-full p-1.5 text-muted hover:bg-foreground/8 hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.button
            aria-label="Close"
            className="absolute inset-0 bg-overlay cursor-pointer"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-ornate/40 bg-surface p-6 shadow-lifted"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 flex items-center justify-between">
              {title && <h2 className="type-h3">{title}</h2>}
              <button onClick={onClose} aria-label="Close drawer" className="rounded-full p-1.5 text-muted hover:bg-foreground/8 cursor-pointer">
                <X className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-2 left-1/2 z-40 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-soft border border-ornate/50 bg-raised px-2.5 py-1 text-xs text-foreground opacity-0 shadow-resting transition-opacity duration-200 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

/* ---------------- Toast ---------------- */

interface ToastItem {
  id: number;
  message: string;
  tone: "default" | "success" | "error";
}

const ToastContext = createContext<{ toast: (message: string, tone?: ToastItem["tone"]) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, tone: ToastItem["tone"] = "default") => {
    const id = ++idRef.current;
    setItems((cur) => [...cur, { id, message, tone }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 3600);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ x: 80, opacity: 0, rotate: 2 }}
              animate={{ x: 0, opacity: 1, rotate: 0 }}
              exit={{ y: 30, opacity: 0, rotate: -4 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto flex items-center gap-2.5 rounded-soft border bg-raised px-4 py-3 shadow-lifted ${
                t.tone === "success" ? "border-success/50" : t.tone === "error" ? "border-error/50" : "border-ornate/50"
              }`}
            >
              <Marigold aria-hidden className={`size-5 shrink-0 ${t.tone === "error" ? "text-error" : "text-accent"}`} />
              <span className="text-sm font-medium">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
