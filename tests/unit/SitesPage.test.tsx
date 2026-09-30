import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SitesPage from '../../src/pages/SitesPage.tsx';

const renderPage = () =>
  render(
    <MemoryRouter>
      <SitesPage />
    </MemoryRouter>,
  );

const cardNames = () =>
  screen.getAllByRole('article').map((card) => within(card).getByRole('heading', { level: 2 }).textContent);

describe('SitesPage', () => {
  it('shows the title, explanation and catalog summary', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Vaccination sites' })).toBeInTheDocument();
    expect(screen.getByText(/community vaccination activity was documented/)).toBeInTheDocument();
    expect(screen.getByText('3 instances · 1 page · Page 1 of 1')).toBeInTheDocument();
  });

  it('prominently links to current Austin Public Health resources', () => {
    renderPage();
    expect(screen.getByRole('link', { name: "Austin Public Health's current immunization resources" })).toHaveAttribute(
      'href',
      'https://www.austintexas.gov/health/programs/immunizations',
    );
  });

  it('lists all three site cards by name A–Z with a historical badge', () => {
    renderPage();
    expect(screen.getByText('Showing 3 of 3 sites')).toBeInTheDocument();
    expect(cardNames()).toEqual([
      'Austin First Spanish SDA Church',
      'Montopolis Recreation and Community Center',
      'Travis County Exposition Center',
    ]);
    expect(screen.getAllByText('Historical example')).toHaveLength(3);
  });

  it('shows a unique photo and all five labeled attributes on each card', () => {
    renderPage();
    const cards = screen.getAllByRole('article');
    const photos = new Set(cards.map((card) => within(card).getByRole('img').getAttribute('src')));
    expect(photos.size).toBe(3);
    for (const card of cards) {
      for (const label of ['Address', 'Population served', 'Cost/payment', 'Appointment method', 'Offered vaccines']) {
        expect(within(card).getByText(label)).toBeInTheDocument();
      }
    }
  });

  it('filters by address while keeping the catalog summary unchanged', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('Address'), '78741');
    expect(screen.getByText('Showing 1 of 3 sites')).toBeInTheDocument();
    expect(cardNames()).toEqual(['Montopolis Recreation and Community Center']);
    expect(screen.getByText('3 instances · 1 page · Page 1 of 1')).toBeInTheDocument();
  });

  it('sorts by cost/payment in reverse order', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(screen.getByLabelText('Sort by'), 'costPolicy');
    await user.selectOptions(screen.getByLabelText('Direction'), 'desc');
    // "Not stated…" sorts after "Free…"; the two ties fall back to name A–Z.
    expect(cardNames()).toEqual([
      'Austin First Spanish SDA Church',
      'Travis County Exposition Center',
      'Montopolis Recreation and Community Center',
    ]);
  });
});
