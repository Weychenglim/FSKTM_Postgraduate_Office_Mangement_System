import { greetingFor } from './greeting';

// Malaysia is UTC+8 all year.
const cases: [string, string][] = [
  ['2026-10-17T00:30:00Z', 'Good Morning'],
  ['2026-10-17T03:59:00Z', 'Good Morning'],
  ['2026-10-17T04:00:00Z', 'Good Afternoon'],
  ['2026-10-17T09:59:00Z', 'Good Afternoon'],
  ['2026-10-17T10:00:00Z', 'Good Evening'],
  ['2026-10-17T15:30:00Z', 'Good Evening'],
  ['2026-10-17T20:59:00Z', 'Good Evening'],
  ['2026-10-17T21:00:00Z', 'Good Morning'],
];

for (const [iso, expected] of cases) {
  const actual = greetingFor(new Date(iso));
  if (actual !== expected) throw new Error(`greetingFor(${iso}) gave ${actual}, expected ${expected}.`);
}

console.log('greeting tests passed');
