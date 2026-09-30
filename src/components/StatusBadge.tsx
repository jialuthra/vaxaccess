import { en } from '../content/en.ts';
import type { CardBadge } from '../services/catalog.ts';

// Text labels carry the meaning; color is only a secondary cue.
const variants: Record<CardBadge, string> = {
  historical: 'text-bg-secondary',
  past: 'text-bg-secondary',
  ongoing: 'text-bg-success',
  upcoming: 'text-bg-primary',
};

export default function StatusBadge({ status }: { status: CardBadge }) {
  return <span className={`badge ${variants[status]}`}>{en.badges[status]}</span>;
}
