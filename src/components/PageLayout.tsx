import type { ReactNode } from 'react';
import { en } from '../content/en.ts';
import Footer from './Footer.tsx';
import Navbar from './Navbar.tsx';

/**
 * Landmarks shared by all 14 pages (DESIGN.md §4.2): skip link, navigation, the single
 * `main` and the footer. Each page supplies its own container and `h1`.
 */
export default function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <a href="#main-content" className="visually-hidden-focusable skip-link">
        {en.nav.skipToContent}
      </a>
      <Navbar />
      {/* tabIndex lets the skip link move keyboard focus here, not just scroll. */}
      <main id="main-content" tabIndex={-1} className="flex-grow-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
