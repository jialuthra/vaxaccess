import { useMemo } from 'react';
import ModelListing from '../components/ModelListing.tsx';
import { en } from '../content/en.ts';
import { getOpportunityCards, getCatalogSummary } from '../services/catalog.ts';
 
export default function OpportunitiesPage() {
  const strings = en.models.opportunities;
  const summary = getCatalogSummary('opportunities');
  const cards = useMemo(() => getOpportunityCards(), []);
 
  return (
    <div className="container py-4">
      <h1>{strings.title}</h1>
      <p className="lead">{strings.description}</p>
      <p>{en.listing.catalogSummary(summary.instances, summary.pages, summary.page)}</p>
 
      <ModelListing kind="opportunities" cards={cards} />
    </div>
  );
}