import { useLocation } from 'react-router-dom';

/** Router state carried by redirects for unknown instance IDs. */
export interface RedirectState {
  notice: string;
}

function isRedirectState(state: unknown): state is RedirectState {
  return typeof state === 'object' && state !== null && typeof (state as RedirectState).notice === 'string';
}

/**
 * Shows the explanation passed by a redirect. It lives in router state, so it is
 * intentionally gone after a page refresh.
 */
export default function RedirectNotice() {
  const { state } = useLocation();
  if (!isRedirectState(state)) {
    return null;
  }
  return (
    <div className="container pt-3">
      <div className="alert alert-info mb-0" role="status">
        {state.notice}
      </div>
    </div>
  );
}
