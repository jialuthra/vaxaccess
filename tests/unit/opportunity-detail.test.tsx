import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import OpportunityDetailPage from '../../src/pages/OpportunityDetailPage.tsx';
import { getOpportunity } from '../../src/services/catalog.ts';
import type { VolunteerOpportunity } from '../../src/types/domain.ts';

const renderPage = (opportunity: VolunteerOpportunity) =>
  render(
    <MemoryRouter>
      <OpportunityDetailPage opportunity={opportunity} />
    </MemoryRouter>,
  );

const pastOpportunity = getOpportunity('ut-flu-expo-2020')!;

describe('OpportunityDetailPage', () => {
  it('marks past opportunities as closed and offers no signup button', () => {
    renderPage(pastOpportunity);

    expect(screen.getByText('Past activity — not accepting signups through this listing.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign up/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'View historical source' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore organizer information' })).toHaveAttribute(
      'href',
      pastOpportunity.organizerUrl,
    );
  });

  it('supports an ongoing role with no end date', () => {
    renderPage({
      ...pastOpportunity,
      kind: 'ongoing',
      status: 'ongoing',
      endDate: null,
      dateLabel: '',
      applicationUrl: 'https://example.org/apply',
    });

    expect(screen.queryByText(/not accepting signups/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', 'https://example.org/apply');
    expect(screen.getByText('Ongoing — no end date')).toBeInTheDocument();
  });
});