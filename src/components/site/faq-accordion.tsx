import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * FAQ list.
 *
 * Renders nothing when empty, every answer has to come from the client, and a
 * care home's FAQ is exactly the wrong place to guess. The structure and the
 * FAQPage structured data are ready for Phase 8.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;

  return (
    <Accordion className="border-rule divide-rule divide-y rounded border">
      {items.map((item) => (
        <AccordionItem key={item.question} value={item.question} className="px-5">
          <AccordionTrigger className="text-h3 py-5 text-left font-sans font-bold">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-ink-soft max-w-[68ch] pb-5">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
