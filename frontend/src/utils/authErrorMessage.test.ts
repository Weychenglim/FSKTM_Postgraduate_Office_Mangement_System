import assert from 'node:assert/strict';

import { authenticationErrorMessage } from './authErrorMessage';


const apiError = (message: string, status: number) =>
  Object.assign(new Error(message), { status });

assert.equal(
  authenticationErrorMessage(
    apiError('Request was throttled.', 429),
    'Cannot reach the server.',
  ),
  'Too many attempts. Please wait and try again later.',
);

assert.equal(
  authenticationErrorMessage(apiError('Invalid reset token.', 400), 'Fallback'),
  'Invalid reset token.',
);

assert.equal(
  authenticationErrorMessage(new Error('Network failure'), 'Cannot reach the server.'),
  'Cannot reach the server.',
);
