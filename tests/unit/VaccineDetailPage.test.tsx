import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import VaccineDetailPage from '../../src/pages/VaccineDetailPage.tsx';
import { getPhoto, getVaccine, getVaccines } from '../../src/services/catalog.ts';
import type { Vaccine } from '../../src/types/domain.ts';

const renderVaccine = (vaccine: Vaccine) =>
  render(
    <MemoryRouter>
      <VaccineDetailPage vaccine={vaccine} />
    </MemoryRouter>,
  );

const mpox = () => getVaccine('mpox')!;
const section = (name: string) => screen.getByRole('region', { name });

describe('VaccineDetailPage', () => {
  it('has one page heading and the summary', () => {
    renderVaccine(mpox());
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Mpox' })).toBeInTheDocument();
    expect(screen.getByText(mpox().summary)).toBeInTheDocument();
  });

  it('tells visitors to confirm eligibility and timing with a provider', () => {
    renderVaccine(mpox());
    const note = section('Check with a provider');
    expect(within(note).getByText(/confirm eligibility and timing with a qualified provider/)).toBeInTheDocument();
    expect(within(note).getByRole('link', { name: 'Find current vaccination services' })).toHaveAttribute(
      'href',
      'https://www.austintexas.gov/health/programs/immunizations',
    );
  });

  it('lists all five labeled facts', () => {
    renderVaccine(mpox());
    const facts = section('At a glance');
    const expected: [string, string][] = [
      ['Diseases prevented', 'Mpox'],
      ['Intended age group', mpox().ageGroup],
      ['Vaccine type', mpox().vaccineType],
      ['Administration', mpox().administrationMethod],
      ['Dose/schedule', 'Two doses, four weeks (28 days) apart'],
    ];
    for (const [label, value] of expected) {
      expect(within(facts).getByText(label)).toBeInTheDocument();
      expect(within(facts).getByText(value)).toBeInTheDocument();
    }
  });

  it.each(getVaccines().map((vaccine) => [vaccine.id, vaccine] as const))(
    '%s shows its photo with credit and the privacy-enhanced APH video',
    (_id, vaccine) => {
      renderVaccine(vaccine);
      const expected = getPhoto(vaccine.photoId)!;
      const photo = screen.getAllByRole('img', { name: expected.alt }).find((img) => img.closest('.media-block'))!;
      expect(photo).toHaveAttribute('src', `/images/vaccine-${vaccine.id}.jpg`);
      expect(photo).not.toHaveAttribute('loading', 'lazy');
      const caption = photo.closest('figure')!;
      expect(within(caption).getByText(expected.caption, { exact: false })).toBeInTheDocument();
      expect(within(caption).getByRole('link', { name: expected.licenseName })).toHaveAttribute('href', expected.licenseUrl);

      const video = section('Video');
      const iframe = within(video).getByTitle('Getting Immunized From A to Z (Austin Public Health) video');
      expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/-P_lgZFUHTs');
      expect(iframe.getAttribute('src')).not.toMatch(/autoplay/);
      expect(within(video).getByText(/not vaccine-specific clinical guidance/i)).toBeInTheDocument();
      expect(within(video).getByRole('link', { name: /Watch on YouTube/ })).toBeInTheDocument();
    },
  );

  it('shows related sites as documented activity and related opportunities as cards', () => {
    renderVaccine(mpox());
    expect(screen.queryByText(/available today/i)).not.toBeInTheDocument();
    const sites = section('Sites with documented vaccination activity');
    expect(within(sites).getByRole('link', { name: 'Montopolis Recreation and Community Center' })).toHaveAttribute(
      'href',
      '/sites/montopolis-recreation-center',
    );
    const opportunities = section('Volunteer opportunities that supported this vaccine');
    expect(within(opportunities).getByRole('link', { name: 'Austin–Travis County MRC mpox-clinic support' })).toHaveAttribute(
      'href',
      '/opportunities/aph-mpox-montopolis-2024',
    );
    expect(within(sites).getAllByRole('heading', { level: 3 })).toHaveLength(1);
  });

  it('links the official CDC pages and lists the sources with the verified date', () => {
    renderVaccine(getVaccine('covid-19')!);
    const links = section('Official medical information');
    expect(within(links).getByRole('link', { name: /interim clinical considerations/i })).toHaveAttribute(
      'href',
      'https://www.cdc.gov/covid/hcp/vaccine-considerations/index.html',
    );
    const sources = section('Sources');
    expect(within(sources).getByRole('link', { name: 'CDC COVID-19 vaccination guidance' })).toBeInTheDocument();
    expect(within(sources).getByText('Facts on this page verified September 30, 2026.')).toBeInTheDocument();
  });
});
