import { Link } from 'react-router-dom';
import { siteConfig } from '../config/site.ts';

// Placeholder until the Home page is built (#23).
export default function HomePage() {
  return (
    <div className="container py-4">
      <h1>Vaccination resources for Austin communities.</h1>
      <p>
        <a href={siteConfig.currentResourcesUrl}>Austin Public Health current immunization resources</a>
      </p>
      <ul>
        <li>
          <Link to="/sites">Browse vaccination sites</Link>
        </li>
        <li>
          <Link to="/vaccines">Explore vaccines</Link>
        </li>
        <li>
          <Link to="/opportunities">Explore volunteer opportunities</Link>
        </li>
      </ul>
    </div>
  );
}
