import { useId } from 'react';
import { en } from '../content/en.ts';
import { formatDate } from '../content/format.ts';
import { getSourcesByIds } from '../services/catalog.ts';

interface SourceListProps {
  /** The record's `sourceIds`, shown in the given order. */
  sourceIds: readonly string[];
  /** The record's `verifiedOn` date. */
  verifiedOn?: string;
  heading?: string;
}

/** Provenance section for detail pages: each source with its publisher and dates. */
export default function SourceList({ sourceIds, verifiedOn, heading = en.sources.heading }: SourceListProps) {
  const headingId = useId();
  const sources = getSourcesByIds(sourceIds);
  return (
    <section className="my-4" aria-labelledby={headingId}>
      <h2 id={headingId} className="h4">
        {heading}
      </h2>
      <ul className="source-list list-unstyled mb-2">
        {sources.map((source) => (
          <li key={source.id}>
            <a href={source.url}>{source.title}</a>
            {source.kind === 'rest' && <span className="badge text-bg-light border ms-2">{en.sources.restApi}</span>}
            <span className="source-meta d-block">
              {[
                source.publisher,
                source.publishedAt && en.sources.published(formatDate(source.publishedAt)),
                source.retrievedAt && en.sources.retrieved(formatDate(source.retrievedAt)),
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </li>
        ))}
      </ul>
      {verifiedOn && <p className="source-meta small mb-0">{en.sources.verifiedOn(formatDate(verifiedOn))}</p>}
    </section>
  );
}
