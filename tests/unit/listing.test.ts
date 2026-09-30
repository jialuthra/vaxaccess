import { describe, expect, it } from 'vitest';
import {
  applyListing,
  compareText,
  filterItems,
  matchesFilters,
  NAME_SORT,
  sortItems,
  type ListingItem,
} from '../../src/services/listing.ts';

type Key = 'color' | 'size';

const item = (id: string, name: string, color: string, size: string): ListingItem<Key> => ({
  id,
  name,
  values: { color, size },
});

const items: ListingItem<Key>[] = [
  item('b', 'Beta', 'Dark Blue', 'Large'),
  item('a', 'Alpha', 'light green', 'Small'),
  item('c', 'Gamma', 'Blue', 'Large'),
];

const ids = (list: readonly ListingItem<Key>[]) => list.map((entry) => entry.id);

describe('matchesFilters', () => {
  it('matches everything when no filters are set', () => {
    expect(filterItems(items, {})).toHaveLength(3);
  });

  it('treats empty and whitespace-only queries as unset', () => {
    expect(filterItems(items, { color: '', size: '   ' })).toHaveLength(3);
  });

  it('matches case-insensitive substrings', () => {
    expect(ids(filterItems(items, { color: 'BLUE' }))).toEqual(['b', 'c']);
  });

  it('trims leading and trailing whitespace from queries', () => {
    expect(ids(filterItems(items, { color: '  green  ' }))).toEqual(['a']);
  });

  it('combines populated filters with AND', () => {
    expect(ids(filterItems(items, { color: 'blue', size: 'large' }))).toEqual(['b', 'c']);
    expect(ids(filterItems(items, { color: 'dark', size: 'large' }))).toEqual(['b']);
    expect(matchesFilters(items[1]!, { color: 'green', size: 'large' })).toBe(false);
  });

  it('returns no items when nothing matches', () => {
    expect(filterItems(items, { color: 'purple' })).toEqual([]);
  });
});

describe('sortItems', () => {
  it('sorts by name A–Z and Z–A', () => {
    expect(ids(sortItems(items, NAME_SORT, 'asc'))).toEqual(['a', 'b', 'c']);
    expect(ids(sortItems(items, NAME_SORT, 'desc'))).toEqual(['c', 'b', 'a']);
  });

  it('sorts by a field key in both directions', () => {
    expect(ids(sortItems(items, 'color', 'asc'))).toEqual(['c', 'b', 'a']);
    expect(ids(sortItems(items, 'color', 'desc'))).toEqual(['a', 'b', 'c']);
  });

  it('breaks ties by name ascending in either direction', () => {
    // Beta and Gamma are both "Large".
    expect(ids(sortItems(items, 'size', 'asc'))).toEqual(['b', 'c', 'a']);
    expect(ids(sortItems(items, 'size', 'desc'))).toEqual(['a', 'b', 'c']);
  });

  it('breaks name ties by ID', () => {
    const twins = [item('z', 'Same', 'x', 'x'), item('m', 'Same', 'x', 'x')];
    expect(ids(sortItems(twins, NAME_SORT, 'asc'))).toEqual(['m', 'z']);
    expect(ids(sortItems(twins, NAME_SORT, 'desc'))).toEqual(['m', 'z']);
  });

  it('does not mutate the input', () => {
    const copy = [...items];
    sortItems(items, NAME_SORT, 'desc');
    expect(items).toEqual(copy);
  });
});

describe('applyListing', () => {
  it('filters before sorting', () => {
    const result = applyListing(items, { filters: { color: 'blue' }, sortKey: NAME_SORT, direction: 'desc' });
    expect(ids(result)).toEqual(['c', 'b']);
  });
});

describe('compareText', () => {
  it('orders English text without regard to case', () => {
    expect(['beta', 'Alpha', 'gamma'].sort(compareText)).toEqual(['Alpha', 'beta', 'gamma']);
  });
});
