import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { siteConfig } from '../../src/config/site.ts';
import AboutPage from '../../src/pages/AboutPage.tsx';
import { getPhotos, getSources, getTeam } from '../../src/services/catalog.ts';

// Tests run without VITE_STATS_URL or VITE_POSTMAN_URL, i.e. the local-development state.
const renderPage = () =>
  render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>,
  );

const section = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section')!;

describe('AboutPage', () => {
  it('has one page heading and its sections in the required order', () => {
    renderPage();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Purpose',
      'Team',
      'Repository statistics',
      'Data sources',
      'Tools',
      'Media credits',
      'Project links',
    ]);
  });

  it('states the purpose and intended users', () => {
    renderPage();
    const purpose = section('Purpose');
    expect(within(purpose).getByText(/uninsured and underinsured people in Austin and Travis County/)).toBeInTheDocument();
    expect(within(purpose).getByRole('heading', { name: 'Who it is for' })).toBeInTheDocument();
    expect(within(purpose).getByText(/dated historical examples/)).toBeInTheDocument();
  });

  it('shows five team cards from team.json, with Jia as Phase I leader', () => {
    renderPage();
    const team = section('Team');
    const cards = within(team).getAllByRole('article');
    expect(cards).toHaveLength(5);
    expect(cards.map((card) => within(card).getByRole('heading', { level: 3 }).textContent)).toEqual(
      getTeam().map((member) => member.name),
    );

    const jia = cards[0]!;
    expect(within(jia).getByText('Phase I leader')).toBeInTheDocument();
    expect(within(jia).getByRole('img', { name: 'Headshot of Jia Luthra' })).toHaveAttribute('src', '/images/team/team-jia.jpg');
    expect(within(jia).getByRole('link', { name: 'GitLab: @jiakl' })).toHaveAttribute('href', 'https://gitlab.com/jiakl');
  });

  it('uses the placeholder for a member without a photo or bio', () => {
    renderPage();
    const luke = within(section('Team')).getAllByRole('article')[4]!;
    expect(within(luke).getByRole('img', { name: 'Luke Yan has not provided a photo yet' })).toHaveAttribute(
      'src',
      '/images/team-placeholder.svg',
    );
  });

  it('shows statistics as not configured, plus the metric definitions', async () => {
    renderPage();
    const stats = section('Repository statistics');
    expect(await within(stats).findByText('Repository statistics are not configured for this build.')).toBeInTheDocument();
    for (const term of ['Commits', 'Issues', 'Unit tests', 'Totals and other contributors', 'Freshness']) {
      expect(within(stats).getByText(term, { selector: 'dt' })).toBeInTheDocument();
    }
    expect(within(stats).getByText(/rather than the assignee/)).toBeInTheDocument();
  });

  it('lists every data source with how it was used', () => {
    renderPage();
    const sources = section('Data sources');
    expect(within(sources).getAllByRole('listitem')).toHaveLength(getSources().length);
    expect(within(sources).getByText('REST API')).toBeInTheDocument();
    expect(within(sources).getByText('Used for: Site coordinates and matched addresses')).toBeInTheDocument();
  });

  it('describes each tool and how it is used', () => {
    renderPage();
    const tools = section('Tools');
    expect(within(tools).getByText('GitLab REST API')).toBeInTheDocument();
    expect(within(tools).getByText(/Supplies the commit, issue and unit-test statistics/)).toBeInTheDocument();
    expect(within(tools).getByText('Postman')).toBeInTheDocument();
  });

  it('credits every photograph, the video, team photos and maps', () => {
    renderPage();
    const credits = section('Media credits');
    for (const photo of getPhotos()) {
      expect(within(credits).getByText(photo.caption, { exact: false })).toBeInTheDocument();
    }
    expect(within(credits).getAllByRole('link', { name: 'View full image and source' })).toHaveLength(getPhotos().length);
    expect(within(credits).getByText(/Getting Immunized From A to Z/)).toBeInTheDocument();
    expect(within(credits).getByText('Provided by Jia Luthra, used with permission')).toBeInTheDocument();
    expect(within(credits).getByRole('link', { name: '© OpenStreetMap contributors' })).toBeInTheDocument();
  });

  it('links the repository and shows the Postman link as not configured', () => {
    renderPage();
    const links = section('Project links');
    expect(within(links).getByRole('link', { name: siteConfig.repositoryUrl })).toHaveAttribute('href', siteConfig.repositoryUrl);
    expect(within(links).getByText(/Postman API documentation:/)).toHaveTextContent('Not configured');
  });
});
