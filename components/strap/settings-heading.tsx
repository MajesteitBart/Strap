import Link from "@/components/link";

// Heading for the Strap-scoped settings screens (personal and company). It says
// which Strap the settings apply to and points to /account, where the settings
// that follow the user across every Strap live.
export function SettingsHeading({ scope }: { scope: string }) {
  return (
    <div>
      <h1 className="font-heading text-[1.75rem] font-semibold tracking-[-0.03em] text-[var(--strap-text-primary)]">
        Settings
      </h1>
      <p className="mt-2 text-[14px] leading-7 text-[var(--strap-text-secondary)]">
        {scope} Your name, sign-in and two-factor authentication are in{" "}
        <Link
          href="/account"
          className="font-medium text-[var(--strap-text-primary)] underline decoration-[var(--strap-border)] underline-offset-4 transition-colors duration-150 hover:decoration-[var(--strap-text-primary)]"
        >
          Account settings
        </Link>
        .
      </p>
    </div>
  );
}
