import { Link } from 'react-router-dom';
import CurrentResourcesLink from '../components/CurrentResourcesLink.tsx';
import MediaBlock from '../components/MediaBlock.tsx';
import { en } from '../content/en.ts';
import { getPhoto } from '../services/catalog.ts';

// The hero reuses the Austin skyline photograph with its own caption and credit (DESIGN.md §4.8).
const HERO_PHOTO_ID = 'opportunity-mpox';

/** Splash page (DESIGN.md §4.2): intro beside the hero, current resources, then Sites/Vaccines before volunteering. */
export default function HomePage() {
  const strings = en.home;
  const hero = getPhoto(HERO_PHOTO_ID);
  return (
    <div className="container py-4">
      <div className="row g-4 align-items-center home-hero">
        <div className="col-lg-6">
          <h1>{strings.heading}</h1>
          <p className="lead">{strings.intro}</p>
          <p>{strings.historicalNote}</p>
        </div>
        {hero && (
          <div className="col-lg-6">
            <MediaBlock type="photo" photo={hero} lazy={false} />
          </div>
        )}
      </div>

      <CurrentResourcesLink body={en.currentResources.homeBody} />

      <section className="my-5" aria-labelledby="home-primary-heading">
        <h2 id="home-primary-heading" className="h4">
          {strings.primaryHeading}
        </h2>
        <div className="row row-cols-1 row-cols-md-2 g-4">
          <div className="col">
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <h3 className="h5 card-title">{strings.sitesHeading}</h3>
                <p className="card-text flex-grow-1">{strings.sitesBlurb}</p>
                <Link className="btn btn-primary align-self-start" to="/sites">
                  {strings.sitesAction}
                </Link>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <h3 className="h5 card-title">{strings.vaccinesHeading}</h3>
                <p className="card-text flex-grow-1">{strings.vaccinesBlurb}</p>
                <Link className="btn btn-primary align-self-start" to="/vaccines">
                  {strings.vaccinesAction}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visually secondary to Sites and Vaccines: support surface and outline button. */}
      <section className="bg-support home-volunteer p-4 mb-4" aria-labelledby="home-volunteer-heading">
        <h2 id="home-volunteer-heading" className="h5">
          {strings.volunteerHeading}
        </h2>
        <p>{strings.volunteerBody}</p>
        <Link className="btn btn-outline-primary btn-sm" to="/opportunities">
          {strings.volunteerAction}
        </Link>
      </section>
    </div>
  );
}
