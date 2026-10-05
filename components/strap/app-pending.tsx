// Shown while the app's access gate and Strap state load: a single blank frame
// in the site background colour, so the document never flashes white before
// the app renders.
export function AppPending() {
  return (
    <div
      className="min-h-screen w-full bg-[var(--strap-background)]"
      aria-hidden="true"
    />
  );
}
