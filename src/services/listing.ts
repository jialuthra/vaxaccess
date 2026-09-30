// Shared filter and sort rules for the model listings (DESIGN.md §4.4).
// The future domain API must use the same semantics, so keep these functions pure.

export type SortDirection = 'asc' | 'desc';

/** Sort option that restores the default ordering. */
export const NAME_SORT = 'name';

export type SortKey<K extends string> = K | typeof NAME_SORT;

/** A record reduced to the display strings that listings filter and sort on. */
export interface ListingItem<K extends string> {
  id: string;
  name: string;
  values: Record<K, string>;
}

/** One text query per field; empty or missing queries match everything. */
export type Filters<K extends string> = Partial<Record<K, string>>;

export interface ListingOptions<K extends string> {
  filters: Filters<K>;
  sortKey: SortKey<K>;
  direction: SortDirection;
}

const collator = new Intl.Collator('en');

/** English locale-aware comparison used everywhere text is ordered. */
export function compareText(a: string, b: string): number {
  return collator.compare(a, b);
}

function normalize(text: string): string {
  return text.toLocaleLowerCase('en-US');
}

/** True when every populated filter is a case-insensitive substring of its display string. */
export function matchesFilters<K extends string>(item: ListingItem<K>, filters: Filters<K>): boolean {
  return (Object.entries(filters) as [K, string | undefined][]).every(([key, query]) => {
    const needle = normalize((query ?? '').trim());
    return needle === '' || normalize(item.values[key]).includes(needle);
  });
}

export function filterItems<K extends string, T extends ListingItem<K>>(
  items: readonly T[],
  filters: NoInfer<Filters<K>>,
): T[] {
  return items.filter((item) => matchesFilters(item, filters));
}

/**
 * Sorts by the chosen key in the chosen direction. Ties fall back to name and then ID,
 * both ascending, so the order is deterministic in either direction.
 */
export function sortItems<K extends string, T extends ListingItem<K>>(
  items: readonly T[],
  sortKey: NoInfer<SortKey<K>>,
  direction: SortDirection,
): T[] {
  const sign = direction === 'asc' ? 1 : -1;
  const primary = (item: T): string => (sortKey === NAME_SORT ? item.name : item.values[sortKey as K]);
  return [...items].sort(
    (a, b) =>
      sign * compareText(primary(a), primary(b)) ||
      compareText(a.name, b.name) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** Filtering precedes sorting. */
export function applyListing<K extends string, T extends ListingItem<K>>(
  items: readonly T[],
  { filters, sortKey, direction }: NoInfer<ListingOptions<K>>,
): T[] {
  return sortItems(filterItems(items, filters), sortKey, direction);
}
