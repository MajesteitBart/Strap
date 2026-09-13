import type { FaqItem } from "@/lib/marketing/faq";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { cn } from "@/lib/utils";

export function FaqSection({
  heading,
  items,
  className,
  tone = "context",
  lede,
}: {
  heading?: string;
  items: FaqItem[];
  className?: string;
  tone?: "context" | "skills" | "secrets" | "environments" | "agents";
  lede?: string;
}) {
  return (
    <section className={cn("strap-page-section", `strap-tone-${tone}`, className)}>
      {heading ? (
        <div className="strap-page-section-head">
          <div>
            <h2>{heading}</h2>
            {lede ? <p>{lede}</p> : null}
          </div>
          <span className="strap-pill strap-pill-count">{items.length} answers</span>
        </div>
      ) : null}
      <FaqAccordion items={items} />
    </section>
  );
}
