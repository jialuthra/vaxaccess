import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
// Project styles load after Bootstrap so the palette overrides take effect.
import './styles/tokens.css';
import './styles/global.css';
import './styles/components.css';
import { routes } from './routes.tsx';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root element');
}

const router = createBrowserRouter(routes);

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
