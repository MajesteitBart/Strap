"use client";

// Shared FAQ accordion for the public site in the worktable language: one
// framed list, one item open at a time, the first open by default. The answer
// text stays in the DOM even when collapsed (a grid-rows collapse, not an
// unmount), so search and answer engines can still read every answer
// regardless of which item is expanded.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/lib/marketing/faq";

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="strap-faq">
      {items.map((item, index) => {
        const open = openIndex === index;

        return (
          <div
            key={item.question}
            className="strap-faq-item"
            data-open={open ? "true" : "false"}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(open ? -1 : index)}
              aria-expanded={open}
              className="strap-faq-trigger"
            >
              <span>{item.question}</span>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="strap-faq-panel">
              <div>
                <p className="strap-faq-answer">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
