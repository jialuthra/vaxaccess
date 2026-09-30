import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { siteConfig } from '../../src/config/site.ts';
import { routes } from '../../src/routes.tsx';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(<RouterProvider router={router} />);
  return { router, ...result };
}

const sections: [string, string][] = [
  ['Home', '/'],
  ['Sites', '/sites'],
  ['Vaccines', '/vaccines'],
  ['Volunteer opportunities', '/opportunities'],
  ['About', '/about'],
];

// The 14 content pages from DESIGN.md §4.1.
const paths = [
  '/',
  '/sites',
  '/vaccines',
  '/opportunities',
  '/sites/travis-county-exposition-center',
  '/sites/montopolis-recreation-center',
  '/sites/austin-first-spanish-sda',
  '/vaccines/influenza',
  '/vaccines/covid-19',
  '/vaccines/mpox',
  '/opportunities/ut-flu-expo-2020',
  '/opportunities/aph-mpox-montopolis-2024',
  '/opportunities/vamos-rundberg-2021',
  '/about',
];

describe('Navbar', () => {
  it('links the brand and every section', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'VaxAccess' })).toHaveAttribute('href', '/');
    for (const [label, href] of sections) {
      expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('marks the current section on detail pages, not Home', () => {
    renderAt('/vaccines/mpox');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Vaccines' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(within(nav).getByRole('link', { name: 'Sites' })).not.toHaveAttribute('aria-current');
  });

  it('marks Home only on the home page', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  });

  it('opens and closes the collapsed menu with the menu button', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/');
    const toggle = screen.getByRole('button', { name: 'Menu' });
    const menu = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(menu).not.toBeNull();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(menu).not.toHaveClass('show');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(menu).toHaveClass('show');

    // Following a link closes the menu.
    await user.click(within(menu!).getByRole('link', { name: 'Sites' }));
    expect(router.state.location.pathname).toBe('/sites');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(menu).not.toHaveClass('show');
  });

  it('closes the menu on Escape and returns focus to the button', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const toggle = screen.getByRole('button', { name: 'Menu' });
    await user.click(toggle);
    await user.tab();
    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });
});

describe('PageLayout', () => {
  it('puts the skip link first and targets the main landmark', () => {
    renderAt('/');
    const skip = screen.getAllByRole('link')[0];
    expect(skip).toHaveTextContent('Skip to main content');
    expect(skip).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it.each(paths)('%s has one main landmark and one h1', (path) => {
    renderAt(path);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('Footer', () => {
  it('links every section and the repository', () => {
    renderAt('/about');
    const footer = screen.getByRole('contentinfo');
    const nav = within(footer).getByRole('navigation', { name: 'Footer' });
    for (const [label, href] of sections) {
      expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
    expect(within(footer).getByRole('link', { name: 'Source code on GitLab' })).toHaveAttribute(
      'href',
      siteConfig.repositoryUrl,
    );
  });
});
