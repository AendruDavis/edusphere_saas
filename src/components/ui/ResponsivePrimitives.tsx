import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export function PageToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center", className)}>{children}</div>;
}

export function FormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("app-form-grid", className)}>{children}</div>;
}

export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("app-segmented-tabs", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={cn("app-tab whitespace-nowrap", value === option.value && "app-tab-active")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function HorizontalScroller({
  children,
  label,
  className,
  showHint = true,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  showHint?: boolean;
}) {
  return (
    <div className={className}>
      {showHint && (
        <div className="flex items-center justify-end gap-1 px-3 py-2 text-xs font-medium text-slate-500 lg:hidden">
          <span>Swipe to see more</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      )}
      <div className="app-scroll-region" role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}
