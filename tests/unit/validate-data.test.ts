import { describe, expect, it } from 'vitest';
import { validateFixtures, type Fixtures } from '../../scripts/lib/dataValidation.ts';
import media from '../../src/data/media.json';
import opportunities from '../../src/data/opportunities.json';
import relationships from '../../src/data/relationships.json';
import sites from '../../src/data/sites.json';
import sources from '../../src/data/sources.json';
import vaccines from '../../src/data/vaccines.json';

// A fresh, mutable copy of the committed fixtures for each test.
const fixtures = (): Fixtures =>
  structuredClone({ sites, vaccines, opportunities, relationships, sources, media } as Fixtures);

const allFilesExist = { fileExists: () => true };

/** Validates after applying a change, with every evidence and image file present. */
function errorsAfter(change: (data: Fixtures) => void): string[] {
  const data = fixtures();
  change(data);
  return validateFixtures(data, allFilesExist);
}

describe('validateFixtures', () => {
  it('accepts the committed fixtures', () => {
    expect(validateFixtures(fixtures(), allFilesExist)).toEqual([]);
  });

  it('requires exactly three records per model', () => {
    expect(errorsAfter((data) => data.vaccines.pop())).toContain('vaccines: expected 3 records, found 2');
  });

  it('rejects duplicate and non-slug IDs', () => {
    const errors = errorsAfter((data) => {
      data.sites[1]!.id = data.sites[0]!.id;
      data.vaccines[0]!.id = 'Influenza Vaccine';
    });
    expect(errors).toContain('sites: duplicate ID "travis-county-exposition-center"');
    expect(errors).toContain('vaccines/Influenza Vaccine: ID is not a lowercase slug');
  });

  it('rejects empty required strings', () => {
    const errors = errorsAfter((data) => {
      data.sites[0]!.costPolicy = '  ';
      data.opportunities[0]!.requirements = [];
    });
    expect(errors).toContain('sites/travis-county-exposition-center: costPolicy is required');
    expect(errors).toContain('opportunities/ut-flu-expo-2020: requirements must be nonempty strings');
  });

  it('rejects references to unknown sources, photos and videos', () => {
    const errors = errorsAfter((data) => {
      data.vaccines[0]!.sourceIds.push('s99-missing');
      data.vaccines[1]!.photoId = 'missing-photo';
      data.vaccines[2]!.videoId = 'missing-video';
    });
    expect(errors).toContain('vaccines/influenza: unknown source "s99-missing"');
    expect(errors).toContain('vaccines/covid-19: unknown photo "missing-photo"');
    expect(errors).toContain('vaccines/mpox: unknown video "missing-video"');
  });

  it('requires field provenance to cite one of the record’s own sources', () => {
    const errors = errorsAfter((data) => {
      data.vaccines[0]!.fieldSources.ageGroup = ['s2-fox7-mpox-event'];
    });
    expect(errors).toContain(
      'vaccines/influenza: fieldSources.ageGroup cites "s2-fox7-mpox-event", which is not in sourceIds',
    );
  });

  it('requires nine distinct card photos', () => {
    const errors = errorsAfter((data) => {
      data.opportunities[0]!.photoId = data.vaccines[0]!.photoId;
    });
    expect(errors).toContain('records: photo "vaccine-influenza" is used by more than one card');
  });

  it('requires collected coordinates in the Austin area', () => {
    const errors = errorsAfter((data) => {
      data.sites[0]!.latitude = null;
      // Swapped latitude/longitude.
      data.sites[1]!.latitude = -97.698902;
      data.sites[1]!.longitude = 30.232316;
    });
    expect(errors).toContain('sites/travis-county-exposition-center: coordinates are required from Census collection');
    expect(errors).toContain('sites/montopolis-recreation-center: coordinates (-97.698902, 30.232316) are outside the Austin area');
  });

  it('requires source evidence to be retained', () => {
    const data = fixtures();
    data.sources[0]!.retrievedAt = null;
    const errors = validateFixtures(data, { fileExists: (path) => !path.includes('s2-fox7') });
    expect(errors).toContain('sources/s1-ut-flu-volunteer-notice: retrievedAt must be an ISO UTC timestamp from collection');
    expect(errors).toContain('sources/s2-fox7-mpox-event: evidence file data/raw/s2-fox7-mpox-event.json is missing from data/raw/');
  });

  it('requires at least one REST source with evidence', () => {
    const errors = validateFixtures(fixtures(), { fileExists: (path) => !path.includes('census') });
    expect(errors).toContain('sources: no REST source has retained evidence');
  });

  it('requires complete photo metadata and the image file', () => {
    const data = fixtures();
    data.media.photos[0]!.originalUrl = null;
    data.media.photos[1]!.width = null;
    data.media.photos[2]!.alt = '';
    const errors = validateFixtures(data, { fileExists: (path) => !path.endsWith('vaccine-mpox.jpg') });
    expect(errors).toContain('media/photos/site-expo: originalUrl must be an absolute HTTPS URL');
    expect(errors).toContain('media/photos/site-montopolis: width and height must be positive integers');
    expect(errors).toContain('media/photos/site-rundberg: alt is required');
    expect(errors).toContain('media/photos/vaccine-mpox: image file public/images/vaccine-mpox.jpg is missing');
  });

  it('requires HTTPS external links', () => {
    const errors = errorsAfter((data) => {
      data.sites[0]!.externalLinks[0]!.url = 'http://www.traviscountytx.gov/exposition-center/rental';
    });
    expect(errors).toContain(
      'sites/travis-county-exposition-center: external link "Travis County Exposition Center" needs a label and an HTTPS URL',
    );
  });

  it.each([
    ['an ISO date', 'Single-day event on 2020-11-07'],
    ['a month name', 'Saturday, November 7'],
    ['a year', 'Weekly during 2021'],
    ['a numeric date', 'One shift on 11/7'],
  ])('rejects a time commitment containing %s', (_label, timeCommitment) => {
    const errors = errorsAfter((data) => {
      data.opportunities[0]!.timeCommitment = timeCommitment;
    });
    expect(errors).toContain('opportunities/ut-flu-expo-2020: timeCommitment must not contain a date');
  });

  it('rejects a signup link on a past activity', () => {
    const errors = errorsAfter((data) => {
      data.opportunities[0]!.applicationUrl = 'https://www.signupgenius.com/go/example';
    });
    expect(errors).toContain('opportunities/ut-flu-expo-2020: a past activity must not have an applicationUrl');
  });

  it('accepts an archived ongoing program with null dates', () => {
    const vamos = fixtures().opportunities.find((opportunity) => opportunity.id === 'vamos-rundberg-2021');
    expect(vamos).toMatchObject({ kind: 'ongoing', status: 'past', startDate: null, endDate: null });
    expect(validateFixtures(fixtures(), allFilesExist)).toEqual([]);
  });

  it('rejects invalid or inverted dates', () => {
    const errors = errorsAfter((data) => {
      data.opportunities[0]!.startDate = '2020-11-08';
      data.opportunities[1]!.startDate = null;
      data.opportunities[2]!.endDate = '2021-13-01';
    });
    expect(errors).toContain('opportunities/ut-flu-expo-2020: startDate is after endDate');
    expect(errors).toContain('opportunities/aph-mpox-montopolis-2024: day precision requires a startDate');
    expect(errors).toContain('opportunities/vamos-rundberg-2021: endDate must be null or an ISO date');
  });

  it('rejects dangling and duplicate relationship edges', () => {
    const errors = errorsAfter((data) => {
      data.relationships.siteVaccine.push({ ...data.relationships.siteVaccine[0]! });
      data.relationships.opportunitySite[0]!.siteId = 'no-such-site';
    });
    expect(errors).toContain('relationships/siteVaccine: duplicate edge travis-county-exposition-center → influenza');
    expect(errors).toContain('relationships/opportunitySite[0]: unknown siteId "no-such-site"');
  });

  it('requires every record to connect to both other models', () => {
    const errors = errorsAfter((data) => {
      data.relationships.opportunityVaccine = data.relationships.opportunityVaccine.filter(
        (edge) => edge.vaccineId !== 'mpox',
      );
    });
    expect(errors).toContain('vaccines/mpox: not connected to any opportunity');
    expect(errors).toContain('opportunities/aph-mpox-montopolis-2024: not connected to any vaccine');
  });

  it('requires evidence on each edge', () => {
    const errors = errorsAfter((data) => {
      data.relationships.siteVaccine[0]!.sourceIds = [];
      data.relationships.siteVaccine[1]!.context = '';
    });
    expect(errors).toContain('relationships/siteVaccine[0]: sourceIds must not be empty');
    expect(errors).toContain('relationships/siteVaccine[1]: context is required');
  });
});
