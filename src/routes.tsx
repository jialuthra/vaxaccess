import { Navigate, useParams, type RouteObject } from 'react-router-dom';
import App from './App.tsx';
import type { RedirectState } from './components/RedirectNotice.tsx';
import { en } from './content/en.ts';
import AboutPage from './pages/AboutPage.tsx';
import HomePage from './pages/HomePage.tsx';
import OpportunitiesPage from './pages/OpportunitiesPage.tsx';
import OpportunityDetailPage from './pages/OpportunityDetailPage.tsx';
import SiteDetailPage from './pages/SiteDetailPage.tsx';
import SitesPage from './pages/SitesPage.tsx';
import VaccineDetailPage from './pages/VaccineDetailPage.tsx';
import VaccinesPage from './pages/VaccinesPage.tsx';
import { getOpportunity, getSite, getVaccine, type ModelKind } from './services/catalog.ts';

// Route map (DESIGN.md §4.1): exactly 14 content pages. Unknown paths and unknown
// instance IDs redirect into existing pages; there is deliberately no 404 page.

/** Sends an unknown instance ID back to its listing with a visible explanation. */
function UnknownRecord({ kind }: { kind: ModelKind }) {
  const strings = en.models[kind];
  const state: RedirectState = { notice: en.redirect.unknownRecord(strings.singular, strings.plural) };
  return <Navigate to={`/${kind}`} replace state={state} />;
}

// Each detail route resolves its record first so the page components only render
// known records. Keying by ID resets page state when moving between instances.

function SiteRoute() {
  const site = getSite(useParams().id ?? '');
  return site ? <SiteDetailPage key={site.id} site={site} /> : <UnknownRecord kind="sites" />;
}

function VaccineRoute() {
  const vaccine = getVaccine(useParams().id ?? '');
  return vaccine ? <VaccineDetailPage key={vaccine.id} vaccine={vaccine} /> : <UnknownRecord kind="vaccines" />;
}

function OpportunityRoute() {
  const opportunity = getOpportunity(useParams().id ?? '');
  return opportunity ? (
    <OpportunityDetailPage key={opportunity.id} opportunity={opportunity} />
  ) : (
    <UnknownRecord kind="opportunities" />
  );
}

export const routes: RouteObject[] = [
  {
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'sites', element: <SitesPage /> },
      { path: 'sites/:id', element: <SiteRoute /> },
      { path: 'vaccines', element: <VaccinesPage /> },
      { path: 'vaccines/:id', element: <VaccineRoute /> },
      { path: 'opportunities', element: <OpportunitiesPage /> },
      { path: 'opportunities/:id', element: <OpportunityRoute /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
