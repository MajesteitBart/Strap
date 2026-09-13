"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { LoaderCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UploadIcon, type UploadIconHandle } from "@/components/ui/upload";
import { cn } from "@/lib/utils";

export type ProfileAvatarKind = "person" | "company";

const SIZE_CLASS = {
  sm: "h-6 w-6 rounded-[8px] after:rounded-[8px]",
  md: "h-9 w-9 rounded-sm after:rounded-sm",
  lg: "h-40 w-40 rounded-[26px] after:rounded-[26px]",
  responsive:
    "h-[calc(1.25rem+0.5rem+2.75rem)] w-[calc(1.25rem+0.5rem+2.75rem)] rounded-[18px] after:rounded-[18px] md:h-[clamp(7rem,28vw,10rem)] md:w-[clamp(7rem,28vw,10rem)] md:rounded-[26px] md:after:rounded-[26px]",
} as const;

const IMAGE_RADIUS = {
  sm: "rounded-[8px]",
  md: "rounded-sm",
  lg: "rounded-[26px]",
  responsive: "rounded-[18px] md:rounded-[26px]",
} as const;

export function ProfileAvatar({
  kind,
  name,
  initials,
  avatarUrl,
  size = "md",
  className,
}: {
  kind: ProfileAvatarKind;
  name: string;
  initials?: string;
  avatarUrl?: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl) && failedUrl !== avatarUrl;
  const fallbackText =
    kind === "company" ? (name.trim().charAt(0) || "C") : initials;

  return (
    <Avatar
      className={cn(
        "shrink-0 overflow-hidden border border-[var(--strap-border)] bg-[var(--strap-surface-raised)]",
        kind === "company" &&
          !showImage &&
          "bg-[var(--strap-surface-raised)] text-[var(--strap-text-primary)]",
        SIZE_CLASS[size],
        className,
      )}
    >
      {showImage && avatarUrl ? (
        <Image
          key={avatarUrl}
          src={avatarUrl}
          alt={name}
          fill
          className={cn("object-cover", IMAGE_RADIUS[size])}
          referrerPolicy="no-referrer"
          unoptimized
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        <AvatarFallback
          className={cn(
            "bg-transparent font-medium text-current",
            size === "lg" || size === "responsive"
              ? "text-[2.15rem] leading-none tracking-[-0.06em] md:text-[clamp(3.5rem,12vw,4.5rem)]"
              : "text-[13px]",
          )}
        >
          {fallbackText}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

export function EditableProfileAvatar({
  kind,
  name,
  initials,
  avatarUrl,
  disabled,
  uploading,
  onFile,
}: {
  kind: ProfileAvatarKind;
  name: string;
  initials?: string;
  avatarUrl?: string;
  disabled?: boolean;
  uploading?: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadIconRef = useRef<UploadIconHandle | null>(null);

  return (
    <div className="relative h-[calc(1.25rem+0.5rem+2.75rem)] w-[calc(1.25rem+0.5rem+2.75rem)] shrink-0 md:h-[clamp(7rem,28vw,10rem)] md:w-[clamp(7rem,28vw,10rem)]">
      <ProfileAvatar
        kind={kind}
        name={name}
        initials={initials}
        avatarUrl={avatarUrl}
        size="responsive"
        className="h-[calc(1.25rem+0.5rem+2.75rem)] w-[calc(1.25rem+0.5rem+2.75rem)] md:h-[clamp(7rem,28vw,10rem)] md:w-[clamp(7rem,28vw,10rem)]"
      />
      <button
        type="button"
        disabled={disabled || uploading}
        aria-label={`Upload ${kind === "company" ? "company" : "profile"} picture`}
        onClick={() => inputRef.current?.click()}
        onMouseEnter={() => uploadIconRef.current?.startAnimation()}
        onMouseLeave={() => uploadIconRef.current?.stopAnimation()}
        onFocus={() => uploadIconRef.current?.startAnimation()}
        onBlur={() => uploadIconRef.current?.stopAnimation()}
        className={cn(
          "group absolute inset-0 flex items-center justify-center rounded-[18px] transition-colors duration-150 md:rounded-[26px]",
          disabled
            ? "cursor-not-allowed"
            : cn(
                "cursor-pointer hover:bg-black/35 focus-visible:bg-black/35 focus-visible:outline-none",
                uploading && "bg-black/35",
              ),
        )}
      >
        {uploading ? (
          <LoaderCircle className="h-7 w-7 animate-spin text-white" />
        ) : disabled ? null : (
          <UploadIcon
            ref={uploadIconRef}
            size={30}
            className="text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
