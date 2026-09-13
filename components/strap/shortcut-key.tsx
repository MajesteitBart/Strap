"use client";

import { cn } from "@/lib/utils";

export function ShortcutKey({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--strap-border)] bg-[var(--strap-surface-raised)] text-[10px] font-medium leading-none text-[var(--strap-text-secondary)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
