import { NavLink, Outlet, ScrollRestoration } from 'react-router-dom';
import RedirectNotice from './components/RedirectNotice.tsx';
import { en } from './content/en.ts';

const navItems = [
  { to: '/', label: en.nav.home, end: true },
  { to: '/sites', label: en.nav.sites, end: false },
  { to: '/vaccines', label: en.nav.vaccines, end: false },
  { to: '/opportunities', label: en.nav.opportunities, end: false },
  { to: '/about', label: en.nav.about, end: false },
];

// Application shell shared by all 14 pages. The minimal header below is temporary
// until the Navbar, Footer and PageLayout components are built (#14).
export default function App() {
  return (
    <>
      <header className="border-bottom">
        <nav className="container d-flex flex-wrap gap-3 py-2" aria-label="Main">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="main-content">
        <RedirectNotice />
        <Outlet />
      </main>
      <ScrollRestoration />
    </>
  );
}
