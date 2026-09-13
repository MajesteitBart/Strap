type AnimatedHeadingProps = {
  text: string;
  className?: string;
};

// Section headings used to play a per-glyph blur-in. That letter-by-letter
// animation now lives only in onboarding; the docs and examples pages render
// plain headings and let the worktable hierarchy carry the entrance. Kept as a
// component so multi-line titles still split onto explicit lines.
export function AnimatedSectionHeading({ text, className }: AnimatedHeadingProps) {
  const lines = text.split("\n");
  return (
    <h2 className={className}>
      {lines.map((line, index) => (
        <span key={`${line}-${index}`} className="block">
          {line}
        </span>
      ))}
    </h2>
  );
}
