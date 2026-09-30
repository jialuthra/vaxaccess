import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SiteDetailPage from '../../src/pages/SiteDetailPage.tsx';
import { getSite, getSites } from '../../src/services/catalog.ts';
import type { Site } from '../../src/types/domain.ts';

const renderSite = (site: Site) =>
  render(
    <MemoryRouter>
      <SiteDetailPage site={site} />
    </MemoryRouter>,
  );

const expo = () => getSite('travis-county-exposition-center')!;

const section = (name: string) => screen.getByRole('region', { name });

describe('SiteDetailPage', () => {
  it('has one page heading and a historical badge', () => {
    renderSite(expo());
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Travis County Exposition Center' })).toBeInTheDocument();
    expect(screen.getByText('Historical example')).toBeInTheDocument();
  });

  it('shows the dated context, the not-current note and a link to current services', () => {
    renderSite(expo());
    const context = section('Documented activity');
    expect(within(context).getByText('Influenza vaccination event, November 7, 2020')).toBeInTheDocument();
    expect(within(context).getByText(/does not mean this venue offers vaccinations today/)).toBeInTheDocument();
    expect(within(context).getByRole('link', { name: 'Find current vaccination services' })).toHaveAttribute(
      'href',
      'https://www.austintexas.gov/health/programs/immunizations',
    );
  });

  it('lists cost, population and appointment method, showing documented absences', () => {
    renderSite(getSite('montopolis-recreation-center')!);
    const access = section('Access details');
    expect(within(access).getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Cost/payment',
      'Population and eligibility',
      'Appointment method',
    ]);
    expect(within(access).getByText('Free at the documented event')).toBeInTheDocument();
    expect(within(access).getByText('Not stated in the historical source')).toBeInTheDocument();
  });

  it('shows the photo with its caption and credit', () => {
    renderSite(expo());
    const photo = screen.getByAltText('An empty banquet hall with a low blue stage, steps and a podium');
    expect(photo).toHaveAttribute('src', '/images/site-expo.jpg');
    expect(screen.getByText(/not a photo of the vaccination event/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CC BY-SA 2.0' })).toBeInTheDocument();
  });

  it('shows the address and an OpenStreetMap embed centered on the collected coordinates', () => {
    renderSite(expo());
    const location = section('Location');
    expect(within(location).getByText('7311 Decker Lane, Austin, TX 78724')).toBeInTheDocument();
    const map = within(location).getByTitle('OpenStreetMap of Travis County Exposition Center');
    expect(map.getAttribute('src')).toContain('marker=30.297558,-97.62382');
    expect(within(location).getByText(/Event-location context/)).toBeInTheDocument();
    expect(within(location).getByRole('link', { name: 'Open in OpenStreetMap' })).toBeInTheDocument();
  });

  it('links to the related vaccine and volunteer opportunity', () => {
    renderSite(expo());
    const vaccines = section('Vaccines with documented activity at this site');
    expect(within(vaccines).getByRole('link', { name: 'Influenza (flu)' })).toHaveAttribute('href', '/vaccines/influenza');
    const opportunities = section('Volunteer opportunities at this site');
    expect(
      within(opportunities).getByRole('link', { name: 'UT nursing flu-vaccination support at the Expo Center' }),
    ).toHaveAttribute('href', '/opportunities/ut-flu-expo-2020');
  });

  it('lists its sources, marking the Census REST source', () => {
    renderSite(expo());
    const sources = section('Sources');
    expect(within(sources).getByRole('link', { name: 'UT nursing flu-vaccination volunteer notice' })).toBeInTheDocument();
    expect(within(sources).getByText('REST API')).toBeInTheDocument();
    expect(within(sources).getByText(/Published October 30, 2020/)).toBeInTheDocument();
  });

  it.each(getSites().map((site): [string, Site] => [site.id, site]))('renders %s with both related models and a map', (_id, site) => {
    renderSite(site);
    expect(screen.getByRole('heading', { level: 1, name: site.name })).toBeInTheDocument();
    expect(within(section('Vaccines with documented activity at this site')).getAllByRole('article').length).toBeGreaterThan(0);
    expect(within(section('Volunteer opportunities at this site')).getAllByRole('article').length).toBeGreaterThan(0);
    expect(screen.getByTitle(`OpenStreetMap of ${site.name}`)).toBeInTheDocument();
  });
});
