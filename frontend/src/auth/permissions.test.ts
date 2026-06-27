import assert from 'node:assert/strict';
import { SIDEBAR_ITEMS } from '../constants/navigation';
import { UserRole } from '../types';
import { canAccessModule } from './permissions';

const roles: UserRole[] = [
  'Office Staff/Admin',
  'Programme Coordinator',
  'Lecturer',
  'Student',
];

for (const role of roles) {
  assert.equal(
    canAccessModule(role, SIDEBAR_ITEMS.NOTIFICATIONS),
    true,
    `${role} should be able to open the header notifications route.`,
  );
}

console.log('permissions tests passed');
