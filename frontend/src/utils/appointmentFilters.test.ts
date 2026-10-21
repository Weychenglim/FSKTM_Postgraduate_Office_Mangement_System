import assert from 'node:assert/strict';
import {clearAppointmentFilterParams} from './appointmentFilters';

const original=new URLSearchParams('view=history&size=25&panelLecturer=staff:L1&student=7&source=inbox&q=test&type=supporting&status=APPROVED&programme=Computing&semester=S1&from=2026-01-01&to=2026-02-01&sort=oldest&page=3');
const cleared=clearAppointmentFilterParams(original);
assert.equal(cleared.toString(),'view=history&size=25&panelLecturer=staff%3AL1&student=7&source=inbox');
assert.equal(original.get('q'),'test','Do not mutate the previous URL state');
assert.equal(clearAppointmentFilterParams(cleared).toString(),cleared.toString());
console.log('Atomic appointment reset preserves view, size and route/source context');
