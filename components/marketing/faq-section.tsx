import type { FaqItem } from "@/lib/marketing/faq";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

export function FaqSection({
  heading,
  items,
  className,
}: {
  heading?: string;
  items: FaqItem[];
  className?: string;
}) {
  return (
    <section className={className}>
      {heading ? (
        <h2 className="text-[22px] font-medium tracking-[-0.01em] text-[var(--strap-text-primary)] md:text-[26px]">
          {heading}
        </h2>
      ) : null}
      <div className="mt-6">
        <FaqAccordion items={items} />
      </div>
    </section>
  );
}
