"use client";

import { ProfileAvatar } from "@/components/strap/profile-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";

export type SpaceOption = {
  id: string;
  label: string;
  type: "personal" | "company";
  avatarInitials: string;
  avatarUrl?: string;
};

export function AuthorizeSpacePicker({ spaces }: { spaces: SpaceOption[] }) {
  // Default to the personal Strap (or the first space if there is none), so the
  // common case is a single click. The choice is required and always resolves
  // to exactly one space.
  const [selectedId, setSelectedId] = useState<string>(() => {
    const personal = spaces.find((space) => space.type === "personal");
    return (personal ?? spaces[0])?.id ?? "";
  });
  const selected = spaces.find((space) => space.id === selectedId);
  const labelId = useId();

  return (
    <div className="strap-field">
      <span className="strap-field-label" id={labelId}>
        Strap to connect
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-labelledby={labelId}
            className="strap-input flex items-center justify-between gap-2 text-left"
          >
            <span className="flex min-w-0 items-center gap-2">
              {selected ? (
                <ProfileAvatar
                  kind={selected.type === "company" ? "company" : "person"}
                  name={selected.label}
                  initials={selected.avatarInitials}
                  avatarUrl={selected.avatarUrl}
                  size="sm"
                />
              ) : null}
              <span className="truncate">
                {selected?.label ?? "Select a Strap"}
              </span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="strap-public-theme w-[var(--radix-dropdown-menu-trigger-width)] max-w-[min(24rem,90vw)]"
        >
          {spaces.map((space) => {
            const isSelected = space.id === selectedId;
            return (
              <DropdownMenuItem
                key={space.id}
                onSelect={() => setSelectedId(space.id)}
                className="flex items-center justify-between gap-3 px-2 text-[13px]"
              >
                <span className="flex min-w-0 items-center gap-2 text-[var(--strap-text-primary)]">
                  <ProfileAvatar
                    kind={space.type === "company" ? "company" : "person"}
                    name={space.label}
                    initials={space.avatarInitials}
                    avatarUrl={space.avatarUrl}
                    size="sm"
                  />
                  <span className="truncate">{space.label}</span>
                </span>
                {isSelected ? (
                  <Check
                    className="h-3.5 w-3.5 shrink-0 text-[var(--strap-text-secondary)]"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* The form posts the single chosen Strap; the server re-validates that the
          user is a member of it before granting the connection. */}
      <input type="hidden" name="creed_grant" value={selectedId} />
    </div>
  );
}
