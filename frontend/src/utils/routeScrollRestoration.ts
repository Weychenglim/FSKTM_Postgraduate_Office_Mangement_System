export interface RouteScrollSnapshot {
  pathname: string;
  search: string;
  hash: string;
}

export const shouldResetWindowScroll = (
  previous: RouteScrollSnapshot | null,
  next: RouteScrollSnapshot,
): boolean => {
  if (previous === null) return true;
  return previous.pathname !== next.pathname || previous.search !== next.search;
};
