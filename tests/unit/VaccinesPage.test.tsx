import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import VaccinesPage from '../../src/pages/VaccinesPage.tsx';

const renderPage = () =>
  render(
    <MemoryRouter>
      <VaccinesPage />
    </MemoryRouter>,
  );

const cardNames = () =>
  screen.getAllByRole('article').map((card) => within(card).getByRole('heading', { level: 2 }).textContent);

describe('VaccinesPage', () => {
  it('shows the title, explanation and catalog summary', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Vaccines' })).toBeInTheDocument();
    expect(screen.getByText(/based on CDC guidance/)).toBeInTheDocument();
    expect(screen.getByText('3 instances · 1 page · Page 1 of 1')).toBeInTheDocument();
  });

  it('lists all three vaccine cards by name A–Z', () => {
    renderPage();
    expect(screen.getByText('Showing 3 of 3 vaccines')).toBeInTheDocument();
    expect(cardNames()).toEqual(['COVID-19', 'Influenza (flu)', 'Mpox']);
  });

  it('links each card to its detail page', () => {
    renderPage();
    for (const [name, href] of [
      ['COVID-19', '/vaccines/covid-19'],
      ['Influenza (flu)', '/vaccines/influenza'],
      ['Mpox', '/vaccines/mpox'],
    ]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('shows a unique photo and all five labeled attributes on each card', () => {
    renderPage();
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(3);
    const photos = new Set(cards.map((card) => within(card).getByRole('img').getAttribute('src')));
    expect(photos.size).toBe(3);
    for (const card of cards) {
      for (const label of ['Diseases prevented', 'Intended age group', 'Vaccine type', 'Administration', 'Dose/schedule']) {
        expect(within(card).getByText(label)).toBeInTheDocument();
      }
    }
  });

  it('filters by a vaccine field while keeping the catalog summary unchanged', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('Administration'), 'subcutaneous');
    expect(screen.getByText('Showing 1 of 3 vaccines')).toBeInTheDocument();
    expect(cardNames()).toEqual(['Mpox']);
    expect(screen.getByText('3 instances · 1 page · Page 1 of 1')).toBeInTheDocument();
  });
});
