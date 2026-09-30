import type { Site } from '../types/domain.ts';

// Placeholder until the Site detail page is built (#20).
export default function SiteDetailPage({ site }: { site: Site }) {
  return (
    <div className="container py-4">
      <h1>{site.name}</h1>
      <p>{site.summary}</p>
    </div>
  );
}
