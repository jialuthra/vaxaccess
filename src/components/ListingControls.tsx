import { useId, useState } from 'react';
import { en } from '../content/en.ts';
import { NAME_SORT, type Filters, type SortDirection } from '../services/listing.ts';

export interface ListingField {
  key: string;
  label: string;
}

interface ListingControlsProps {
  fields: readonly ListingField[];
  filters: Filters<string>;
  onFilterChange: (key: string, value: string) => void;
  sortKey: string;
  onSortKeyChange: (key: string) => void;
  direction: SortDirection;
  onDirectionChange: (direction: SortDirection) => void;
  onClearFilters: () => void;
}

/** Collapsible per-field text filters plus sort field and direction selectors (DESIGN.md §4.4). */
export default function ListingControls({
  fields,
  filters,
  onFilterChange,
  sortKey,
  onSortKeyChange,
  direction,
  onDirectionChange,
  onClearFilters,
}: ListingControlsProps) {
  const id = useId();
  const [expanded, setExpanded] = useState(true);
  const panelId = `${id}-filters`;

  return (
    <section className="card card-body mb-3" aria-labelledby={`${id}-heading`}>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h2 id={`${id}-heading`} className="h5 mb-0">
          {en.listing.filtersHeading}
        </h2>
        <button
          type="button"
          className="btn btn-link btn-sm"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? en.listing.hideFilters : en.listing.showFilters}
        </button>
      </div>

      <div id={panelId} hidden={!expanded} className="row g-3 mt-1">
        {fields.map((field) => (
          <div key={field.key} className="col-12 col-md-6 col-lg-4">
            <label htmlFor={`${id}-filter-${field.key}`} className="form-label small mb-1">
              {field.label}
            </label>
            <input
              id={`${id}-filter-${field.key}`}
              type="search"
              className="form-control form-control-sm"
              placeholder={en.listing.filterPlaceholder}
              value={filters[field.key] ?? ''}
              onChange={(event) => onFilterChange(field.key, event.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="row g-3 mt-1 align-items-end">
        <div className="col-12 col-sm-6 col-lg-4">
          <label htmlFor={`${id}-sort`} className="form-label small mb-1">
            {en.listing.sortBy}
          </label>
          <select
            id={`${id}-sort`}
            className="form-select form-select-sm"
            value={sortKey}
            onChange={(event) => onSortKeyChange(event.target.value)}
          >
            <option value={NAME_SORT}>{en.listing.sortByName}</option>
            {fields.map((field) => (
              <option key={field.key} value={field.key}>
                {field.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-sm-6 col-lg-4">
          <label htmlFor={`${id}-direction`} className="form-label small mb-1">
            {en.listing.direction}
          </label>
          <select
            id={`${id}-direction`}
            className="form-select form-select-sm"
            value={direction}
            onChange={(event) => onDirectionChange(event.target.value as SortDirection)}
          >
            <option value="asc">{en.listing.ascending}</option>
            <option value="desc">{en.listing.descending}</option>
          </select>
        </div>
        <div className="col-12 col-lg-4">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClearFilters}>
            {en.listing.clearFilters}
          </button>
        </div>
      </div>
    </section>
  );
}
