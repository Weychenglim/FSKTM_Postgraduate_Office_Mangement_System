import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NotificationItem } from '../types';
import { BELL_PREVIEW_COUNT, latestNotifications, notificationRecordRoute } from './notificationLinks';

const item = (id: string, extra: Partial<NotificationItem> = {}): NotificationItem => ({
  id,
  title: `Notice ${id}`,
  service: 'Postgraduate Office',
  description: 'Body',
  timeAgo: '11 Oct 2026, 10:30 AM',
  priority: 'normal',
  isUnread: true,
  isAnnouncement: false,
  reference: '',
  recipient: 'Student',
  ...extra,
});

// the bell shows the five newest, in feed order
const feed = ['7', '6', '5', '4', '3', '2', '1'].map((id) => item(id));
assert.equal(BELL_PREVIEW_COUNT, 5);
assert.deepEqual(latestNotifications(feed).map((n) => n.id), ['7', '6', '5', '4', '3']);
assert.deepEqual(latestNotifications([]), []);

// both the bell and the Notifications page open the same record
const cases: Array<[Partial<NotificationItem>, string | null]> = [
  [{ isAnnouncement: true, targetModule: 'LETTERS', recordId: '9' }, null],
  [{ targetModule: 'LETTERS' }, null],
  [{ targetModule: 'SUPERVISOR_APPOINTMENTS', recordType: 'SUPERVISOR_APPLICATION', recordId: '42' }, '/supervisor-appointments/42'],
  [{ targetModule: 'PANEL_APPOINTMENTS', recordType: 'PANEL_RECOMMENDATION', recordId: '7' }, '/panel-appointments/recommendations/7'],
  [{ targetModule: 'LETTERS', recordType: 'GENERATED_LETTER', recordId: '3' }, '/letters/my-letters'],
  [{ targetModule: 'DASHBOARD', recordType: 'TIMELINE_ENTRY', recordId: '12' }, '/dashboard'],
  [{ targetModule: 'MARKS', recordType: 'EVALUATION_PERIOD', recordId: '4' }, '/marks'],
  [{ targetModule: 'SOMETHING_NEW', recordId: '1' }, '/notifications'],
];
for (const [extra, expected] of cases) {
  assert.equal(notificationRecordRoute(item('x', extra)), expected, JSON.stringify(extra));
}

// the bell dropdown and the page share the helper instead of copies of the rule
const header = readFileSync(resolve('src/components/TopHeader.tsx'), 'utf8');
const page = readFileSync(resolve('src/components/NotificationsAnnouncements.tsx'), 'utf8');
for (const text of ['latestNotifications(items)', 'notificationRecordRoute(notification)', 'No new notifications', 'Mark all as read', 'View all']) {
  assert.ok(header.includes(text), `TopHeader is missing ${text}`);
}
assert.ok(page.includes('notificationRecordRoute(notification)'));
assert.doesNotMatch(page, /notification\.targetModule\s*\n?\s*&& notification\.recordId/);

// Settings offers the three new switches next to announcement alerts
const settings = readFileSync(resolve('src/components/SettingsView.tsx'), 'utf8');
for (const id of ['pref-ann', 'pref-email', 'pref-deadlines', 'pref-summary']) {
  assert.ok(settings.includes(`id="${id}"`), `Settings is missing the ${id} switch`);
}

console.log('Notification link tests passed.');
