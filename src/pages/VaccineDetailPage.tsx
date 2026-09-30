import type { Vaccine } from '../types/domain.ts';

// Placeholder until the Vaccine detail page is built (#21).
export default function VaccineDetailPage({ vaccine }: { vaccine: Vaccine }) {
  return (
    <div className="container py-4">
      <h1>{vaccine.name}</h1>
      <p>{vaccine.summary}</p>
    </div>
  );
}
