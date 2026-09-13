import { FaqSection } from "@/components/marketing/faq-section";
import { pricingFaqItems } from "@/lib/marketing/faq";

// Pricing FAQ that ships in the initial HTML and backs the page's FAQ schema.
export function PricingReference() {
  return (
    <FaqSection
      heading="Pricing questions"
      lede="Straight answers on what free means, what runs on the included key, and what stays yours."
      items={pricingFaqItems}
      tone="environments"
    />
  );
}
