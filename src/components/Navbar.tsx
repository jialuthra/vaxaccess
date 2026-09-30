import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { en } from '../content/en.ts';
import { navItems } from './navItems.ts';

/**
 * Global navigation (DESIGN.md §4.2). Bootstrap's JavaScript isn't loaded, so the mobile
 * collapse is driven by React state using Bootstrap's `.collapse`/`.show` classes.
 * NavLink marks the current section with `.active` and `aria-current`, including on
 * detail pages (e.g. /vaccines/mpox marks Vaccines).
 */
export default function Navbar() {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const close = () => setOpen(false);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      close();
      toggleRef.current?.focus();
    }
  }

  return (
    <header>
      <nav className="navbar navbar-expand-lg va-navbar" aria-label={en.nav.label}>
        <div className="container" onKeyDown={handleKeyDown}>
          <Link to="/" className="navbar-brand" onClick={close}>
            {en.siteName}
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="navbar-toggler"
            aria-controls={menuId}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="navbar-toggler-icon" aria-hidden="true" />
            <span className="ms-2 align-middle">{en.nav.menu}</span>
          </button>
          <div id={menuId} className={`collapse navbar-collapse${open ? ' show' : ''}`}>
            <ul className="navbar-nav ms-auto">
              {navItems.map((item) => (
                <li key={item.to} className="nav-item">
                  <NavLink to={item.to} end={item.end} className="nav-link" onClick={close}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}
