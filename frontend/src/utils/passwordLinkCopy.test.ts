import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { APP_ROUTES, isKnownAppPath } from '../constants/routes';
import { PASSWORD_LINK_COPY } from './passwordLinkCopy';

const { activation, reset } = PASSWORD_LINK_COPY;

// Activation links have no time limit; reset links expire after 30 minutes.
assert.doesNotMatch(Object.values(activation).join(' '), /minute|expires/i);
assert.match(activation.note, /does not expire/);
assert.match(activation.note, /stops working once you have set your password/);
assert.match(reset.note, /30 minutes/);
assert.match(reset.note, /works only once/);
assert.equal(activation.submitLabel, 'Activate Account');
assert.equal(reset.submitLabel, 'Reset Password');
assert.match(activation.invalidSubtitle, /already active/);
assert.match(reset.invalidSubtitle, /expired or has already been used/);

// The page says the same thing as the emails.
const emails = readFileSync(resolve('../backend/accounts/account_emails.py'), 'utf8');
assert.ok(emails.includes(activation.note), 'activation page and email must describe the link the same way');
assert.ok(emails.includes('expires in {minutes} minutes and works only once'));
assert.ok(emails.includes('Forgot Password?'), 'emails must name the button exactly as the sign-in page shows it');
const passwordInput = readFileSync(resolve('src/components/PasswordInput.tsx'), 'utf8');
assert.ok(passwordInput.includes('Forgot Password?'));

// The activation email opens its own page, which the app treats as a sign-in page.
const tokens = readFileSync(resolve('../backend/accounts/tokens.py'), 'utf8');
assert.ok(tokens.includes(`ACTIVATION_PATH = "${APP_ROUTES.activateAccount}"`));
assert.ok(tokens.includes(`RESET_PATH = "${APP_ROUTES.resetPassword}"`));
assert.equal(isKnownAppPath(APP_ROUTES.activateAccount), true);

const app = readFileSync(resolve('src/App.tsx'), 'utf8');
assert.match(app, /kind=\{pathname === APP_ROUTES\.activateAccount \? 'activation' : 'reset'\}/);
assert.match(app, /pathname === APP_ROUTES\.resetPassword \|\| pathname === APP_ROUTES\.activateAccount/);

const page = readFileSync(resolve('src/components/ResetPasswordPage.tsx'), 'utf8');
assert.match(page, /authApi\s*\.checkPasswordLink\(uid, token\)/, 'the page checks the link before showing the form');
assert.match(page, /isInvalidPasswordLink\(err\)/);

// The check is a dry run of the existing endpoint, so the public API surface does not grow.
const authApi = readFileSync(resolve('src/services/authApi.ts'), 'utf8');
assert.match(authApi, /'\/auth\/password-reset\/confirm\/'[\s\S]{0,120}JSON\.stringify\(\{ uid, token, dryRun: true \}\)/);

console.log('Password link page wording tests passed.');
