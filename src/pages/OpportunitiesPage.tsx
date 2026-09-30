import { Link } from 'react-router-dom';
import { en } from '../content/en.ts';
import { getCatalogSummary } from '../services/catalog.ts';

// Placeholder until the listing page is built (#19).
export default function OpportunitiesPage() {
  const strings = en.models.opportunities;
  const summary = getCatalogSummary('opportunities');
  return (
    <div className="container py-4">
      <h1>{strings.title}</h1>
      <p>{en.listing.catalogSummary(summary.instances, summary.pages, summary.page)}</p>
      <Link to="/">{en.nav.home}</Link>
    </div>
  );
}
