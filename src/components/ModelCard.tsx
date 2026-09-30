import { Link } from 'react-router-dom';
import { en } from '../content/en.ts';
import { MODEL_FIELDS, type AnyCardData } from '../services/catalog.ts';
import StatusBadge from './StatusBadge.tsx';

interface ModelCardProps {
  card: AnyCardData;
  /** 2 on listing pages; 3 inside related-record sections that already have an h2. */
  headingLevel?: 2 | 3;
}

/** Card used on listings and in related-record sections: photo, name, five labeled attributes. */
export default function ModelCard({ card, headingLevel = 2 }: ModelCardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const labels: Record<string, string> = en.fieldLabels[card.kind];
  const values: Record<string, string> = card.values;
  const { photo } = card;

  return (
    <article className="card h-100 model-card">
      {photo && (
        <figure className="mb-0">
          <div className="ratio ratio-16x9">
            <img
              src={photo.localPath}
              alt={photo.alt}
              width={photo.width ?? undefined}
              height={photo.height ?? undefined}
              loading="lazy"
              className="card-img-top object-fit-cover"
            />
          </div>
          <figcaption className="small text-body-secondary px-3 pt-2">
            {photo.caption}{' '}
            <a href={photo.sourcePageUrl}>
              {en.listing.photoSource}: {photo.creator}, {photo.licenseName}
            </a>
          </figcaption>
        </figure>
      )}
      <div className="card-body">
        <Heading className="h5 card-title">
          <Link to={card.href}>{card.name}</Link>
        </Heading>
        {card.badge && (
          <p className="mb-2">
            <StatusBadge status={card.badge} />
          </p>
        )}
        <dl className="mb-0">
          {MODEL_FIELDS[card.kind].map((key) => (
            <div key={key} className="mb-2">
              <dt className="small text-body-secondary">{labels[key]}</dt>
              <dd className="mb-0 text-break">{values[key]}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="card-footer bg-transparent border-0 pt-0 pb-3">
        <Link to={card.href} className="btn btn-outline-primary btn-sm" aria-label={`${en.listing.viewDetails}: ${card.name}`}>
          {en.listing.viewDetails}
        </Link>
      </div>
    </article>
  );
}
