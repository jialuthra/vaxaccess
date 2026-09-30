import type { VolunteerOpportunity } from '../types/domain.ts';

// Placeholder until the opportunity detail page is built (#22).
export default function OpportunityDetailPage({ opportunity }: { opportunity: VolunteerOpportunity }) {
  return (
    <div className="container py-4">
      <h1>{opportunity.name}</h1>
      <p>{opportunity.summary}</p>
    </div>
  );
}
