import { siteConfig } from '../config/site.ts';
import { en } from '../content/en.ts';

/**
 * Prominent link to Austin Public Health's current immunization resources. Phase I
 * records are historical, so listings point visitors to where current services are.
 */
export default function CurrentResourcesLink({ body }: { body?: string }) {
  const strings = en.currentResources;
  return (
    <aside className="current-resources p-3 my-3" aria-label={strings.heading}>
      <p className="fw-semibold mb-1">{strings.heading}</p>
      <p className="mb-2">{body ?? strings.body}</p>
      <a className="btn btn-primary btn-sm" href={siteConfig.currentResourcesUrl}>
        {strings.link}
      </a>
    </aside>
  );
}
