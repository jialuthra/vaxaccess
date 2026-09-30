import { Outlet, ScrollRestoration } from 'react-router-dom';
import PageLayout from './components/PageLayout.tsx';
import RedirectNotice from './components/RedirectNotice.tsx';

// Application shell shared by all 14 pages: navbar, main landmark and footer.
export default function App() {
  return (
    <>
      <PageLayout>
        <RedirectNotice />
        <Outlet />
      </PageLayout>
      <ScrollRestoration />
    </>
  );
}
