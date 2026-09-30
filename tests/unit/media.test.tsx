import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MediaBlock, { osmEmbedUrl, osmMapUrl } from '../../src/components/MediaBlock.tsx';
import SourceList from '../../src/components/SourceList.tsx';
import { formatDate } from '../../src/content/format.ts';
import { getPhoto, getVideo } from '../../src/services/catalog.ts';

describe('osmEmbedUrl', () => {
  it('builds a small bounding box around a marker', () => {
    expect(osmEmbedUrl(30.3, -97.7)).toBe(
      'https://www.openstreetmap.org/export/embed.html?bbox=-97.706000,30.296000,-97.694000,30.304000&layer=mapnik&marker=30.3,-97.7',
    );
  });
});

describe('osmMapUrl', () => {
  it('links to the coordinates when known', () => {
    expect(osmMapUrl(30.3, -97.7, 'x')).toBe('https://www.openstreetmap.org/?mlat=30.3&mlon=-97.7#map=17/30.3/-97.7');
  });

  it('falls back to an address search without coordinates', () => {
    expect(osmMapUrl(null, null, '1 Main St, Austin, TX')).toBe(
      'https://www.openstreetmap.org/search?query=1%20Main%20St%2C%20Austin%2C%20TX',
    );
  });
});

describe('MediaBlock', () => {
  it('renders a lazy photo with caption, license and source links', () => {
    const photo = getPhoto('site-montopolis')!;
    render(<MediaBlock type="photo" photo={photo} />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt', photo.alt);
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('width', '1200');
    expect(screen.getByText(photo.caption, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: photo.licenseName })).toHaveAttribute('href', photo.licenseUrl);
    expect(screen.getByRole('link', { name: 'View full image and source' })).toHaveAttribute('href', photo.sourcePageUrl);
  });

  it('can load a first-screen photo eagerly', () => {
    render(<MediaBlock type="photo" photo={getPhoto('site-expo')!} lazy={false} />);
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'eager');
  });

  it('renders a titled map with attribution', () => {
    render(<MediaBlock type="map" label="Somewhere" address="1 Main St" latitude={30.3} longitude={-97.7} />);
    expect(screen.getByTitle('OpenStreetMap of Somewhere')).toHaveAttribute('src', osmEmbedUrl(30.3, -97.7));
    expect(screen.getByRole('link', { name: '© OpenStreetMap contributors' })).toBeInTheDocument();
  });

  it('keeps the address link but no iframe when coordinates are missing', () => {
    const { container } = render(<MediaBlock type="map" label="Somewhere" address="1 Main St" latitude={null} longitude={null} />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText('Map coordinates have not been collected yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in OpenStreetMap' })).toHaveAttribute(
      'href',
      osmMapUrl(null, null, '1 Main St'),
    );
  });

  it('embeds video through the privacy-enhanced host without autoplay', () => {
    const video = getVideo('aph-getting-immunized')!;
    render(<MediaBlock type="video" video={video} />);
    const frame = screen.getByTitle('Getting Immunized From A to Z (Austin Public Health) video');
    expect(frame.getAttribute('src')).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\//);
    expect(frame.getAttribute('src')).not.toMatch(/autoplay/);
    expect(screen.getByRole('link', { name: 'Watch on YouTube (Austin Public Health)' })).toHaveAttribute('href', video.watchUrl);
  });
});

describe('formatDate', () => {
  it('formats a calendar date without shifting it to the previous day', () => {
    expect(formatDate('2020-10-30')).toBe('October 30, 2020');
  });

  it('formats a timestamp in Austin time', () => {
    expect(formatDate('2026-10-01T03:00:00Z')).toBe('September 30, 2026');
  });
});

describe('SourceList', () => {
  it('lists sources in order with publisher and dates, skipping unknown IDs', () => {
    render(<SourceList sourceIds={['s2-fox7-mpox-event', 'missing', 's11-census-geocoder']} verifiedOn="2026-09-29" />);
    const links = screen.getAllByRole('link').map((link) => link.textContent);
    expect(links).toEqual(['FOX 7 report on the August 24, 2024 mpox vaccination event', 'Census Geocoder REST API']);
    expect(screen.getByText(/FOX 7 Austin · Published August 24, 2024 · Retrieved/)).toBeInTheDocument();
    expect(screen.getByText('REST API')).toBeInTheDocument();
    expect(screen.getByText('Facts on this page verified September 29, 2026.')).toBeInTheDocument();
  });
});
