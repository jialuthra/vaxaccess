import { Link } from 'react-router-dom';
import { en } from '../content/en.ts';
import { getCatalogSummary } from '../services/catalog.ts';

// Placeholder until the listing page is built (#18).
export default function VaccinesPage() {
  const strings = en.models.vaccines;
  const summary = getCatalogSummary('vaccines');
  return (
    <div className="container py-4">
      <h1>{strings.title}</h1>
      <p>{en.listing.catalogSummary(summary.instances, summary.pages, summary.page)}</p>
      <Link to="/">{en.nav.home}</Link>
    </div>
  );
}
