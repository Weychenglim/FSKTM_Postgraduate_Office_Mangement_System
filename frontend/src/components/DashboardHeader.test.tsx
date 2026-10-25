import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StudentDashboard} from './StudentDashboard';
import {LecturerDashboard} from './LecturerDashboard';
import {CoordinatorDashboard} from './CoordinatorDashboard';
import {AdministrationDashboard} from './AdministrationDashboard';

const navigate = () => {};
for (const [role, component] of [
  ['Student', <StudentDashboard studentName="Test student" onNavigateToTab={navigate}/>],
  ['Lecturer', <LecturerDashboard onNavigateToTab={navigate}/>],
  ['Coordinator', <CoordinatorDashboard onNavigateToTab={navigate}/>],
  ['Office', <AdministrationDashboard onNavigateToTab={navigate}/>],
] as const) {
  const html = renderToStaticMarkup(component);
  const header = html.match(/<header[^>]*aria-label="Dashboard overview"[\s\S]*?<\/header>/)?.[0];
  assert.ok(header, `${role} must use the shared dashboard header`);
  assert.match(header, /<h1[^>]*>Dashboard<\/h1>/);
  assert.match(header, /Your academic overview, tasks and upcoming dates\./);
  assert.match(header, /Active academic semester/);
  assert.doesNotMatch(header, /Lecturer Dashboard|Student Dashboard|Programme Coordinator Dashboard/);
}
console.log('All four role dashboards share the title, description and semester context');
