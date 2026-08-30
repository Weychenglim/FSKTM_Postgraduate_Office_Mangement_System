import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIDEBAR_ITEMS } from '../constants/navigation';
import { UserRole } from '../types';
import {
  canAccessMarksAdministration,
  canAccessModule,
} from './permissions';

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

assert.equal(canAccessMarksAdministration('Office Staff/Admin'), true);
assert.equal(canAccessMarksAdministration('Programme Coordinator'), false);
assert.equal(canAccessMarksAdministration('Lecturer'), false);
assert.equal(canAccessMarksAdministration('Student'), false);

const appSource = readFileSync(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../App.tsx',
  ),
  'utf8',
);
assert.match(appSource, /isMarksAdministrationRoute/u);
assert.match(
  appSource,
  /!canAccessMarksAdministration\(currentUser\.role\)/u,
);

console.log('permissions tests passed');
