import assert from 'node:assert/strict';
import * as management from './marksProductionManagement';

// These assertions catch publishing empty targets and approving an unrelated or
// unsaved draft after a preview was fetched.
assert.equal(typeof management.validatePeriodTargeting, 'function', 'period targeting validation must exist');
assert.equal(management.validatePeriodTargeting({ programmeScope: 'SELECTED', programmes: [], evaluatorRoles: ['SUPERVISOR'] }), 'Select at least one programme.');
assert.equal(management.validatePeriodTargeting({ programmeScope: 'ALL', programmes: [], evaluatorRoles: [] }), 'Select at least one evaluator role.');
assert.equal(management.validatePeriodTargeting({ programmeScope: '', programmes: [], evaluatorRoles: ['PANEL'] }), 'Choose a programme scope.');
assert.equal(management.validatePeriodTargeting({ programmeScope: 'SELECTED', programmes: ['PhD'], evaluatorRoles: ['PANEL'] }), null);
assert.equal(management.formatPeriodTargeting({}), 'All programmes · Supervisor and Panel');
assert.equal(management.formatPeriodTargeting({ programmeScope: 'SELECTED', programmes: ['PhD'], evaluatorRoles: ['PANEL'] }), 'PhD · Panel');

const saved = { id: 7, lifecycleStatus: 'DRAFT' };
const preview = { periodId: 7, formSnapshot: 'saved form', periodSnapshot: JSON.stringify(saved) };
assert.equal(management.canPublishPeriodPreview(saved, 'saved form', 'saved form', preview), true);
assert.equal(management.canPublishPeriodPreview(saved, 'unsaved change', 'saved form', preview), false);
assert.equal(management.canPublishPeriodPreview({ ...saved, id: 8 }, 'saved form', 'saved form', preview), false);
assert.equal(management.canPublishPeriodPreview(saved, 'saved form', 'saved form', null), false);
assert.equal(management.canPublishPeriodPreview({ ...saved, lifecycleStatus: 'PUBLISHED' }, 'saved form', 'saved form', preview), false);
assert.equal(management.canPublishPeriodPreview(saved, 'saved form', 'saved form', { ...preview, periodSnapshot: 'previous revision' }), false);
console.log('Marks programme targeting validation and preview freshness passed');
