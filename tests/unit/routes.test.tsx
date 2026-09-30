import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { routes } from '../../src/routes.tsx';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

// The 14 content pages from DESIGN.md §4.1 and each page's heading.
const pages: [string, string][] = [
  ['/', 'Vaccination resources for Austin communities.'],
  ['/sites', 'Vaccination sites'],
  ['/vaccines', 'Vaccines'],
  ['/opportunities', 'Volunteer opportunities'],
  ['/sites/travis-county-exposition-center', 'Travis County Exposition Center'],
  ['/sites/montopolis-recreation-center', 'Montopolis Recreation and Community Center'],
  ['/sites/austin-first-spanish-sda', 'Austin First Spanish SDA Church'],
  ['/vaccines/influenza', 'Influenza (flu)'],
  ['/vaccines/covid-19', 'COVID-19'],
  ['/vaccines/mpox', 'Mpox'],
  ['/opportunities/ut-flu-expo-2020', 'UT nursing flu-vaccination support at the Expo Center'],
  ['/opportunities/aph-mpox-montopolis-2024', 'Austin–Travis County MRC mpox-clinic support'],
  ['/opportunities/vamos-rundberg-2021', 'VAMOS community COVID-19 outreach at Rundberg'],
  ['/about', 'About VaxAccess'],
];

describe('routes', () => {
  it('defines exactly 14 content pages', () => {
    expect(pages).toHaveLength(14);
  });

  it.each(pages)('renders %s without redirecting', (path, heading) => {
    const router = renderAt(path);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
  });

  it('redirects unknown paths to Home, replacing history', () => {
    const router = renderAt('/does-not-exist');
    expect(router.state.location.pathname).toBe('/');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(screen.getByRole('heading', { level: 1, name: 'Vaccination resources for Austin communities.' })).toBeInTheDocument();
  });

  it.each([
    ['/sites/unknown', '/sites', 'site'],
    ['/vaccines/unknown', '/vaccines', 'vaccine'],
    ['/opportunities/unknown', '/opportunities', 'opportunity'],
  ])('redirects unknown instance %s to %s with an explanation', (path, listing, singular) => {
    const router = renderAt(path);
    expect(router.state.location.pathname).toBe(listing);
    expect(router.state.historyAction).toBe('REPLACE');
    expect(screen.getByRole('status')).toHaveTextContent(`We couldn't find that ${singular}.`);
  });

  it('shows no redirect notice on ordinary navigation', () => {
    renderAt('/sites');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
