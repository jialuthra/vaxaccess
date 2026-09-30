import { useMemo, useState } from 'react';
import { en } from '../content/en.ts';
import { MODEL_FIELDS, type AnyCardData, type ModelKind } from '../services/catalog.ts';
import { applyListing, NAME_SORT, type Filters, type SortDirection } from '../services/listing.ts';
import ListingControls from './ListingControls.tsx';
import ModelCard from './ModelCard.tsx';

interface ModelListingProps {
  kind: ModelKind;
  cards: readonly AnyCardData[];
}

/**
 * Filter/sort controls, result count and card grid for one model. Control state lives
 * here, so leaving the page and coming back starts from the default ordering.
 */
export default function ModelListing({ kind, cards }: ModelListingProps) {
  const [filters, setFilters] = useState<Filters<string>>({});
  const [sortKey, setSortKey] = useState<string>(NAME_SORT);
  const [direction, setDirection] = useState<SortDirection>('asc');

  const labels: Record<string, string> = en.fieldLabels[kind];
  const fields = MODEL_FIELDS[kind].map((key) => ({ key, label: labels[key] ?? key }));
  const noun = en.models[kind].plural;

  const results = useMemo(
    () => applyListing<string, AnyCardData>(cards, { filters, sortKey, direction }),
    [cards, filters, sortKey, direction],
  );

  // Clearing filters keeps the selected sort.
  const clearFilters = () => setFilters({});

  return (
    <>
      <ListingControls
        fields={fields}
        filters={filters}
        onFilterChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        direction={direction}
        onDirectionChange={setDirection}
        onClearFilters={clearFilters}
      />

      <p className="fw-semibold" role="status" aria-live="polite">
        {en.listing.showing(results.length, cards.length, noun)}
      </p>

      {results.length === 0 ? (
        <div className="alert alert-light border d-flex flex-wrap align-items-center gap-3">
          <span>{en.listing.noMatches(noun)}</span>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
            {en.listing.clearFilters}
          </button>
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {results.map((card) => (
            <div key={card.id} className="col">
              <ModelCard card={card} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
