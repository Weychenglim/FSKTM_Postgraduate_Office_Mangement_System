import { SIDEBAR_ITEMS } from '../constants/navigation';
import { UserRole } from '../types';
import { defaultLandingPageForUser } from './landingPage';

const roles: UserRole[] = [
  'Office Staff/Admin',
  'Programme Coordinator',
  'Lecturer',
  'Student',
];

for (const role of roles) {
  const landingPage = defaultLandingPageForUser({ role });
  if (landingPage !== SIDEBAR_ITEMS.DASHBOARD) {
    throw new Error(`${role} should land on Dashboard Overview after login.`);
  }
}

console.log('landingPage tests passed');
