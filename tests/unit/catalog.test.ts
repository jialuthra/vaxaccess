import { describe, expect, it } from 'vitest';
import {
  getCatalogSummary,
  getOpportunities,
  getOpportunitiesForSite,
  getOpportunitiesForVaccine,
  getOpportunity,
  getOpportunityCards,
  getSite,
  getSiteCards,
  getSites,
  getSitesForOpportunity,
  getSitesForVaccine,
  getSourcesByIds,
  getVaccine,
  getVaccineCards,
  getVaccines,
  getVaccinesForOpportunity,
  getVaccinesForSite,
  hasRecord,
  MODEL_FIELDS,
  opportunityValues,
  siteValues,
  vaccineValues,
  type AnyCardData,
  type ModelKind,
} from '../../src/services/catalog.ts';
import { applyListing, compareText, NAME_SORT, type ListingItem } from '../../src/services/listing.ts';

const cardsByKind: Record<ModelKind, AnyCardData[]> = {
  sites: getSiteCards(),
  vaccines: getVaccineCards(),
  opportunities: getOpportunityCards(),
};

describe('records', () => {
  it('has three records per model', () => {
    expect(getSites()).toHaveLength(3);
    expect(getVaccines()).toHaveLength(3);
    expect(getOpportunities()).toHaveLength(3);
  });

  it('looks up records by ID', () => {
    expect(getSite('montopolis-recreation-center')?.name).toBe('Montopolis Recreation and Community Center');
    expect(getVaccine('mpox')?.name).toBe('Mpox');
    expect(getOpportunity('vamos-rundberg-2021')?.kind).toBe('ongoing');
    expect(getSite('unknown')).toBeUndefined();
  });

  it('reports whether an instance exists', () => {
    expect(hasRecord('vaccines', 'influenza')).toBe(true);
    expect(hasRecord('vaccines', 'travis-county-exposition-center')).toBe(false);
  });

  it('summarizes each catalog as one page', () => {
    expect(getCatalogSummary('sites')).toEqual({ instances: 3, pages: 1, page: 1 });
  });

  it('returns sources in the requested order and skips unknown IDs', () => {
    const found = getSourcesByIds(['s14-ut-nursing', 'missing', 's1-ut-flu-volunteer-notice']);
    expect(found.map((source) => source.id)).toEqual(['s14-ut-nursing', 's1-ut-flu-volunteer-notice']);
  });
});

describe('relationships', () => {
  it('connects every site to vaccines and opportunities', () => {
    for (const site of getSites()) {
      expect(getVaccinesForSite(site.id).length).toBeGreaterThan(0);
      expect(getOpportunitiesForSite(site.id).length).toBeGreaterThan(0);
    }
  });

  it('connects every vaccine to sites and opportunities', () => {
    for (const vaccine of getVaccines()) {
      expect(getSitesForVaccine(vaccine.id).length).toBeGreaterThan(0);
      expect(getOpportunitiesForVaccine(vaccine.id).length).toBeGreaterThan(0);
    }
  });

  it('connects every opportunity to sites and vaccines', () => {
    for (const opportunity of getOpportunities()) {
      expect(getSitesForOpportunity(opportunity.id).length).toBeGreaterThan(0);
      expect(getVaccinesForOpportunity(opportunity.id).length).toBeGreaterThan(0);
    }
  });

  it('derives the reverse direction of each edge', () => {
    for (const site of getSites()) {
      for (const vaccine of getVaccinesForSite(site.id)) {
        expect(getSitesForVaccine(vaccine.id).map((s) => s.id)).toContain(site.id);
      }
      for (const opportunity of getOpportunitiesForSite(site.id)) {
        expect(getSitesForOpportunity(opportunity.id).map((s) => s.id)).toContain(site.id);
      }
    }
    for (const opportunity of getOpportunities()) {
      for (const vaccine of getVaccinesForOpportunity(opportunity.id)) {
        expect(getOpportunitiesForVaccine(vaccine.id).map((o) => o.id)).toContain(opportunity.id);
      }
    }
  });

  it('links the documented site, vaccine and opportunity triples', () => {
    expect(getVaccinesForSite('travis-county-exposition-center').map((v) => v.id)).toEqual(['influenza']);
    expect(getSitesForOpportunity('aph-mpox-montopolis-2024').map((s) => s.id)).toEqual([
      'montopolis-recreation-center',
    ]);
    expect(getVaccinesForOpportunity('vamos-rundberg-2021').map((v) => v.id)).toEqual(['covid-19']);
  });
});

describe('display strings', () => {
  it('formats a site address as street, city, state and postal code', () => {
    expect(siteValues(getSite('travis-county-exposition-center')!).address).toBe('7311 Decker Lane, Austin, TX 78724');
  });

  it('lists related vaccine names for sites and opportunities', () => {
    expect(siteValues(getSite('montopolis-recreation-center')!).vaccines).toBe('Mpox');
    expect(opportunityValues(getOpportunity('ut-flu-expo-2020')!).vaccines).toBe('Influenza (flu)');
  });

  it('joins array fields with commas in stored order', () => {
    const vaccine = { ...getVaccine('covid-19')!, diseasesPrevented: ['B disease', 'A disease'] };
    expect(vaccineValues(vaccine).diseasesPrevented).toBe('B disease, A disease');
    const opportunity = { ...getOpportunity('ut-flu-expo-2020')!, requirements: ['First', 'Second'] };
    expect(opportunityValues(opportunity).requirements).toBe('First, Second');
  });

  it('passes other fields through unchanged', () => {
    const site = getSite('montopolis-recreation-center')!;
    expect(siteValues(site).costPolicy).toBe(site.costPolicy);
    const vaccine = getVaccine('mpox')!;
    expect(vaccineValues(vaccine).scheduleSummary).toBe(vaccine.scheduleSummary);
  });
});

describe('cards', () => {
  it('uses a distinct photo for each of the nine cards', () => {
    const photos = Object.values(cardsByKind).flatMap((cards) => cards.map((card) => card.photo?.id));
    expect(photos.every(Boolean)).toBe(true);
    expect(new Set(photos).size).toBe(9);
  });

  it('links each card to its detail page', () => {
    expect(getSiteCards().map((card) => card.href)).toContain('/sites/travis-county-exposition-center');
    expect(getOpportunityCards().map((card) => card.href)).toContain('/opportunities/vamos-rundberg-2021');
  });

  it('marks historical sites and past opportunities', () => {
    expect(getSiteCards().every((card) => card.badge === 'historical')).toBe(true);
    expect(getOpportunityCards().every((card) => card.badge === 'past')).toBe(true);
    expect(getVaccineCards().every((card) => card.badge === null)).toBe(true);
  });
});

// Every field of every model must filter and sort on its display string.
const fieldCases = (Object.keys(MODEL_FIELDS) as ModelKind[]).flatMap((kind) =>
  MODEL_FIELDS[kind].map((key) => ({ kind, key })),
);

describe('filtering each field', () => {
  it.each(fieldCases)('$kind filters on $key', ({ kind, key }) => {
    // Widen to plain string keys so one test body covers all three models.
    const cards = cardsByKind[kind] as ListingItem<string>[];
    const target = cards[0]!;
    const value = target.values[key]!;
    // A mixed-case slice of the display string must match the target.
    const query = ` ${value.slice(0, Math.min(6, value.length)).toUpperCase()} `;
    const result = applyListing(cards, { filters: { [key]: query }, sortKey: NAME_SORT, direction: 'asc' });
    expect(result.map((card) => card.id)).toContain(target.id);
    for (const card of result) {
      expect(card.values[key]!.toLowerCase()).toContain(query.trim().toLowerCase());
    }
    const none = applyListing(cards, { filters: { [key]: 'zzz-no-match' }, sortKey: NAME_SORT, direction: 'asc' });
    expect(none).toEqual([]);
  });
});

describe('sorting each field', () => {
  it.each(fieldCases)('$kind sorts on $key in both directions', ({ kind, key }) => {
    const cards = cardsByKind[kind] as ListingItem<string>[];
    const valueOf = (card: ListingItem<string>) => card.values[key]!;
    const asc = applyListing(cards, { filters: {}, sortKey: key, direction: 'asc' }).map(valueOf);
    const desc = applyListing(cards, { filters: {}, sortKey: key, direction: 'desc' }).map(valueOf);
    expect(asc).toEqual([...asc].sort(compareText));
    expect(desc).toEqual([...asc].sort(compareText).reverse());
  });
});
