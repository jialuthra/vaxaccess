import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ModelCard from '../../src/components/ModelCard.tsx';
import ModelListing from '../../src/components/ModelListing.tsx';
import RelatedCards from '../../src/components/RelatedCards.tsx';
import {
  getOpportunity,
  getOpportunityCards,
  getSite,
  getSiteCards,
  getVaccineCards,
  opportunityCard,
  siteCard,
} from '../../src/services/catalog.ts';

const inRouter = (ui: ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

/** Card headings in display order. */
const cardNames = (level = 2) => screen.queryAllByRole('heading', { level }).map((heading) => heading.textContent);

describe('ModelCard', () => {
  it('shows the linked name, five labeled attributes and a detail link', () => {
    const card = siteCard(getSite('travis-county-exposition-center')!);
    inRouter(<ModelCard card={card} />);

    const heading = screen.getByRole('heading', { level: 2, name: 'Travis County Exposition Center' });
    expect(within(heading).getByRole('link')).toHaveAttribute('href', '/sites/travis-county-exposition-center');

    const terms = screen.getAllByRole('term').map((term) => term.textContent);
    expect(terms).toEqual(['Address', 'Population served', 'Cost/payment', 'Appointment method', 'Offered vaccines']);
    expect(screen.getByText('7311 Decker Lane, Austin, TX 78724')).toBeInTheDocument();
    expect(screen.getByText('Influenza (flu)')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'View details: Travis County Exposition Center' })).toHaveAttribute(
      'href',
      '/sites/travis-county-exposition-center',
    );
  });

  it('shows the photo with alt text, caption and source credit', () => {
    const card = siteCard(getSite('montopolis-recreation-center')!);
    inRouter(<ModelCard card={card} />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt', card.photo!.alt);
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(screen.getByText(card.photo!.caption, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Photo source: Larry D\. Moore, CC BY 4\.0/ })).toHaveAttribute(
      'href',
      card.photo!.sourcePageUrl,
    );
  });

  it('labels past opportunities with a text badge', () => {
    inRouter(<ModelCard card={opportunityCard(getOpportunity('ut-flu-expo-2020')!)} />);
    expect(screen.getByText('Past activity')).toBeInTheDocument();
  });

  it('can render its heading one level down', () => {
    inRouter(<ModelCard card={getVaccineCards()[0]!} headingLevel={3} />);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: getVaccineCards()[0]!.name })).not.toBeInTheDocument();
  });
});

describe('ModelListing', () => {
  const renderSites = () => inRouter(<ModelListing kind="sites" cards={getSiteCards()} />);
  const allSiteNames = [
    'Austin First Spanish SDA Church',
    'Montopolis Recreation and Community Center',
    'Travis County Exposition Center',
  ];

  it('starts with every card in name order and a result count', () => {
    renderSites();
    expect(screen.getByText('Showing 3 of 3 sites')).toBeInTheDocument();
    expect(cardNames().filter((name) => name !== 'Filter and sort')).toEqual(allSiteNames);
  });

  it('offers Name and the five fields as sort options', () => {
    renderSites();
    const options = within(screen.getByLabelText('Sort by')).getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual([
      'Name',
      'Address',
      'Population served',
      'Cost/payment',
      'Appointment method',
      'Offered vaccines',
    ]);
  });

  it('filters case-insensitively and combines filters with AND', async () => {
    const user = userEvent.setup();
    renderSites();

    await user.type(screen.getByLabelText('Address'), '  AUSTIN ');
    expect(screen.getByText('Showing 3 of 3 sites')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Offered vaccines'), 'mpox');
    expect(screen.getByText('Showing 1 of 3 sites')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Montopolis Recreation and Community Center' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Cost/payment'), 'not stated');
    expect(screen.getByText('Showing 0 of 3 sites')).toBeInTheDocument();
  });

  it('shows a zero-match message whose Clear filters keeps the chosen sort', async () => {
    const user = userEvent.setup();
    renderSites();

    await user.selectOptions(screen.getByLabelText('Direction'), 'desc');
    await user.type(screen.getByLabelText('Population served'), 'nobody');
    expect(screen.getByText('No sites match these filters.')).toBeInTheDocument();

    const alert = screen.getByText('No sites match these filters.').parentElement!;
    await user.click(within(alert).getByRole('button', { name: 'Clear filters' }));

    expect(screen.getByLabelText('Population served')).toHaveValue('');
    expect(screen.getByText('Showing 3 of 3 sites')).toBeInTheDocument();
    expect(screen.getByLabelText('Direction')).toHaveValue('desc');
    expect(cardNames().filter((name) => name !== 'Filter and sort')).toEqual([...allSiteNames].reverse());
  });

  it('sorts by a field in both directions', async () => {
    const user = userEvent.setup();
    inRouter(<ModelListing kind="opportunities" cards={getOpportunityCards()} />);
    const names = () => cardNames().filter((name) => name !== 'Filter and sort');

    await user.selectOptions(screen.getByLabelText('Sort by'), 'vaccines');
    // Supported vaccines: COVID-19 < Influenza (flu) < Mpox
    const ascending = [
      'VAMOS community COVID-19 outreach at Rundberg',
      'UT nursing flu-vaccination support at the Expo Center',
      'Austin–Travis County MRC mpox-clinic support',
    ];
    expect(names()).toEqual(ascending);

    await user.selectOptions(screen.getByLabelText('Direction'), 'desc');
    expect(names()).toEqual([...ascending].reverse());
  });

  it('collapses and expands the filter panel', async () => {
    const user = userEvent.setup();
    renderSites();
    const toggle = screen.getByRole('button', { name: 'Hide filters' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Show filters' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Address')).not.toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Show filters' }));
    expect(screen.getByLabelText('Address')).toBeVisible();
  });
});

describe('RelatedCards', () => {
  it('renders a section heading with cards one level below it', () => {
    inRouter(<RelatedCards heading="Related vaccines" cards={getVaccineCards()} noun="vaccines" />);
    expect(screen.getByRole('region', { name: 'Related vaccines' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });

  it('explains when no related records are documented', () => {
    inRouter(<RelatedCards heading="Related sites" cards={[]} noun="sites" />);
    expect(screen.getByText('No related sites are documented.')).toBeInTheDocument();
  });
});
