"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Tabs + Accordion. */

export function Tabs({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={`flex flex-wrap gap-1 border-b border-ornate/40 ${className}`}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`relative -mb-px rounded-t-soft px-4 py-2.5 text-sm font-semibold tracking-wide transition-colors cursor-pointer ${
              isActive
                ? "border border-ornate/40 border-b-bg bg-bg text-primary"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            {isActive && <span aria-hidden className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent" />}
          </button>
        );
      })}
    </div>
  );
}

export function Accordion({
  items,
  className = "",
}: {
  items: { id: string; title: string; content: ReactNode }[];
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  return (
    <div className={`divide-y divide-ornate/30 rounded-card border border-ornate/40 bg-surface ${className}`}>
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <div key={item.id}>
            <button
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : item.id)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-semibold cursor-pointer hover:bg-accent/6"
            >
              <span className="type-h3">{item.title}</span>
              <ChevronDown className={`size-5 text-accent transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && <div className="px-5 pb-5 type-body text-muted">{item.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
