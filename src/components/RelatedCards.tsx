import { useId } from 'react';
import { en } from '../content/en.ts';
import type { AnyCardData } from '../services/catalog.ts';
import ModelCard from './ModelCard.tsx';

interface RelatedCardsProps {
  heading: string;
  cards: readonly AnyCardData[];
  /** Plural noun for the empty state, e.g. "vaccines". */
  noun: string;
}

/** Related-record section on detail pages; uses the same cards as the listings. */
export default function RelatedCards({ heading, cards, noun }: RelatedCardsProps) {
  const headingId = useId();
  return (
    <section className="my-4" aria-labelledby={headingId}>
      <h2 id={headingId} className="h4">
        {heading}
      </h2>
      {cards.length === 0 ? (
        <p>{en.related.noneDocumented(noun)}</p>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {cards.map((card) => (
            <div key={card.id} className="col">
              <ModelCard card={card} headingLevel={3} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
