import ModelListing from '../components/ModelListing.tsx';
import { en } from '../content/en.ts';
import { getCatalogSummary, getVaccineCards } from '../services/catalog.ts';

export default function VaccinesPage() {
  const strings = en.models.vaccines;
  const summary = getCatalogSummary('vaccines');
  return (
    <div className="container py-4">
      <h1>{strings.title}</h1>
      <p className="lead">{en.vaccinesPage.intro}</p>
      <p>{en.listing.catalogSummary(summary.instances, summary.pages, summary.page)}</p>
      <ModelListing kind="vaccines" cards={getVaccineCards()} />
    </div>
  );
}
