import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AcademicSemesterManagement } from './AcademicSemesterManagement';

const html = renderToStaticMarkup(<AcademicSemesterManagement onBack={() => {}} onManageParticipants={() => {}} />);
assert.doesNotMatch(html, /<form\b/, 'Browsing semesters must not open a creation form');
assert.match(html, /New semester/);
assert.doesNotMatch(html, /Manage participants|Related tools/);
assert.match(html, /Loading academic semesters/);
assert.doesNotMatch(html, /No effective active semester|New workflows remain paused/, 'Loading must not claim no active semester');
console.log('Semester initial browse, Dashboard-only participant access and honest loading tests passed');
