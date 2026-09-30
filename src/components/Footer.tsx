import { Link } from 'react-router-dom';
import { siteConfig } from '../config/site.ts';
import { en } from '../content/en.ts';
import { navItems } from './navItems.ts';

/**
 * Site footer (DESIGN.md §4.2): existing routes and the repository only. Media credits
 * stay with their images and on About.
 */
export default function Footer() {
  return (
    <footer className="va-footer mt-auto">
      <div className="container py-4">
        <div className="row g-4">
          <div className="col-12 col-md-6">
            <p className="va-footer-brand mb-1">{en.siteName}</p>
            <p className="mb-0">{en.footer.tagline}</p>
          </div>
          <nav className="col-6 col-md-3" aria-label={en.footer.navLabel}>
            <h2 className="h6">{en.footer.explore}</h2>
            <ul className="list-unstyled mb-0">
              {navItems.map((item) => (
                <li key={item.to}>
                  <Link to={item.to}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="col-6 col-md-3">
            <h2 className="h6">{en.footer.project}</h2>
            <ul className="list-unstyled mb-0">
              <li>
                <a href={siteConfig.repositoryUrl}>{en.footer.repository}</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
