import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { RouteScrollSnapshot, shouldResetWindowScroll } from '../utils/routeScrollRestoration';

export const RouteScrollRestoration = () => {
  const location = useLocation();
  const previousLocation = useRef<RouteScrollSnapshot | null>(null);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const nextLocation: RouteScrollSnapshot = {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    };

    if (shouldResetWindowScroll(previousLocation.current, nextLocation)) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    previousLocation.current = nextLocation;
  }, [location.pathname, location.search, location.hash]);

  return null;
};
