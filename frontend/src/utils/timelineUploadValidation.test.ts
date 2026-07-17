import assert from 'node:assert/strict';

import {
  MAX_TIMELINE_UPLOAD_BYTES,
  validateTimelineUploadFile,
} from './timelineUploadValidation';


assert.equal(
  validateTimelineUploadFile({ name: 'timeline.xlsx', size: MAX_TIMELINE_UPLOAD_BYTES }),
  null,
);
assert.equal(
  validateTimelineUploadFile({ name: 'TIMELINE.XLSX', size: 1024 }),
  null,
);
assert.equal(
  validateTimelineUploadFile({ name: 'timeline.xls', size: 1024 }),
  'Only Excel .xlsx timeline files are accepted.',
);
assert.equal(
  validateTimelineUploadFile({
    name: 'timeline.xlsx',
    size: MAX_TIMELINE_UPLOAD_BYTES + 1,
  }),
  'Timeline file must be 10 MB or smaller.',
);
