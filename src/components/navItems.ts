import { en } from '../content/en.ts';

/** Top-level sections shared by the Navbar and Footer (DESIGN.md §4.2). */
export interface NavItem {
  to: string;
  label: string;
  /** Match only the exact path, so Home isn't marked active on every page. */
  end: boolean;
}

export const navItems: readonly NavItem[] = [
  { to: '/', label: en.nav.home, end: true },
  { to: '/sites', label: en.nav.sites, end: false },
  { to: '/vaccines', label: en.nav.vaccines, end: false },
  { to: '/opportunities', label: en.nav.opportunities, end: false },
  { to: '/about', label: en.nav.about, end: false },
];
