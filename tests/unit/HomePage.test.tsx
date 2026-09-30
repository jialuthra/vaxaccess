import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { siteConfig } from '../../src/config/site.ts';
import HomePage from '../../src/pages/HomePage.tsx';

const renderPage = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

describe('HomePage', () => {
  it('shows the heading, intro and historical-examples note', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Vaccination resources for Austin communities.' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/with a focus on people who are uninsured or underinsured/)).toBeInTheDocument();
    expect(screen.getByText(/Phase I includes historical examples/)).toBeInTheDocument();
  });

  it('shows the Austin skyline hero eagerly, with its caption and credit', () => {
    renderPage();
    const hero = screen.getByRole('img', { name: /downtown Austin skyline/ });
    expect(hero).toHaveAttribute('src', '/images/opportunity-mpox.jpg');
    expect(hero).toHaveAttribute('loading', 'eager');
    expect(screen.getByText(/Austin skyline viewed from Montopolis Bridge/)).toBeInTheDocument();
    expect(screen.getByText(/Scott218/)).toBeInTheDocument();
  });

  it('prominently links to current Austin Public Health resources', () => {
    renderPage();
    expect(screen.getByRole('link', { name: "Austin Public Health's current immunization resources" })).toHaveAttribute(
      'href',
      siteConfig.currentResourcesUrl,
    );
    expect(screen.queryByText(/The sites below/)).not.toBeInTheDocument();
  });

  it('emphasizes Sites and Vaccines over volunteering', () => {
    renderPage();
    const sites = screen.getByRole('link', { name: 'Browse vaccination sites' });
    const vaccines = screen.getByRole('link', { name: 'Explore vaccines' });
    const volunteer = screen.getByRole('link', { name: 'Explore volunteer opportunities' });
    expect(sites).toHaveAttribute('href', '/sites');
    expect(vaccines).toHaveAttribute('href', '/vaccines');
    expect(volunteer).toHaveAttribute('href', '/opportunities');
    expect(sites).toHaveClass('btn-primary');
    expect(vaccines).toHaveClass('btn-primary');
    expect(volunteer).not.toHaveClass('btn-primary');
  });
});
