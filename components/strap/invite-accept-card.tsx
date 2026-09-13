"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircle, Send } from "lucide-react";

type Person = { name?: string; avatarUrl?: string; initials: string };

// One framed profile tile with an initials fallback, mirroring the shell/
// roster avatar pattern (no-referrer, unoptimized, error falls back to initials).
function PersonAvatar({ person, label }: { person: Person; label: string }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(person.avatarUrl) && !failed;
  return (
    <span className="strap-consent-glyph" style={{ position: "relative" }}>
      {showImage && person.avatarUrl ? (
        <Image
          key={person.avatarUrl}
          src={person.avatarUrl}
          alt={label}
          fill
          className="object-cover"
          referrerPolicy="no-referrer"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="strap-mono" style={{ fontWeight: 500 }} aria-label={label}>
          {person.initials}
        </span>
      )}
    </span>
  );
}

// The accept / reject action for a valid, signed-in invite. Styled to match the
// MCP consent screen (/authorize): tiles of the inviter and you joined by a
// send glyph, then a secondary Reject (left) and a primary Accept (right).
export function InviteAcceptCard({
  token,
  companyName,
  role,
  inviter,
  you,
}: {
  token: string;
  companyName: string;
  role: "admin" | "member";
  inviter: Person;
  you: { avatarUrl?: string; initials: string; email: string };
}) {
  const router = useRouter();
  const [action, setAction] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = action !== null;

  async function accept() {
    setAction("accept");
    setError(null);
    try {
      const response = await fetch("/api/app/company/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not accept the invite.");
        toast.error(data.error ?? "Could not accept the invite.");
        setAction(null);
        return;
      }
      toast.success(`You joined ${companyName}.`);
      router.push("/file");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setAction(null);
    }
  }

  async function decline() {
    setAction("decline");
    setError(null);
    try {
      const response = await fetch("/api/app/company/invites/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not decline the invite.");
        toast.error(data.error ?? "Could not decline the invite.");
        setAction(null);
        return;
      }
      toast.success("Invite declined.");
      router.push("/file");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setAction(null);
    }
  }

  return (
    <div>
      <div className="strap-consent-glyphs">
        <PersonAvatar person={inviter} label={inviter.name ?? "The person who invited you"} />
        <span className="strap-consent-glyph-join" aria-hidden="true">
          <Send className="h-3.5 w-3.5" />
        </span>
        <PersonAvatar person={{ initials: you.initials, avatarUrl: you.avatarUrl }} label="You" />
      </div>

      <h1>Join {companyName}</h1>
      <p>
        {inviter.name ?? "A teammate"} invited you to the {companyName} Strap as{" "}
        {role === "admin" ? "an admin" : "a member"}. It is the shared context file this company&apos;s AI
        agents read before they work.
      </p>
      <p className="strap-consent-meta">Signed in as {you.email}</p>

      <div className="strap-consent-actions">
        <button
          type="button"
          className="strap-button strap-button-secondary"
          onClick={decline}
          disabled={busy}
        >
          {action === "decline" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-label="Declining" /> : "Reject"}
        </button>
        <button
          type="button"
          className="strap-button strap-button-primary"
          onClick={accept}
          disabled={busy}
        >
          {action === "accept" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-label="Accepting" /> : "Accept"}
        </button>
      </div>

      {error ? (
        <p className="strap-field-error" role="alert" style={{ marginTop: ".75rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
