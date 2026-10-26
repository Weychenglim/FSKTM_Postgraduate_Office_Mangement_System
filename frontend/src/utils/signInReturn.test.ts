import { returnPathAfterSignIn } from './signInReturn';

const cases: [unknown, string | null][] = [
  [{ from: '/notifications' }, '/notifications'],
  [{ from: '/files/letters/31?tab=all' }, '/files/letters/31?tab=all'],
  [{ from: '/login' }, null],
  [{ from: '/' }, null],
  [{ from: '/reset-password?uid=a&token=b' }, null],
  [{ from: '/forgot-password' }, null],
  [{ from: '//evil.example/x' }, null],
  [{ from: 'https://evil.example/x' }, null],
  [{ from: 42 }, null],
  [null, null],
  [undefined, null],
];

for (const [state, expected] of cases) {
  const actual = returnPathAfterSignIn(state);
  if (actual !== expected) {
    throw new Error(`returnPathAfterSignIn(${JSON.stringify(state)}) gave ${actual}, expected ${expected}.`);
  }
}

console.log('signInReturn tests passed');
