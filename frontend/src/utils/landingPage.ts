import { SIDEBAR_ITEMS } from '../constants/navigation';
import { DemoUser } from '../types';

export const defaultLandingPageForUser = (_user: Pick<DemoUser, 'role'>): string => {
  return SIDEBAR_ITEMS.DASHBOARD;
};
