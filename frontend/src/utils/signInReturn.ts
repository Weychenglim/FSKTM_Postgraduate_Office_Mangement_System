/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { APP_ROUTES } from '../constants/routes';

const SIGN_IN_PAGES: readonly string[] = [
  APP_ROUTES.root,
  APP_ROUTES.login,
  APP_ROUTES.forgotPassword,
  APP_ROUTES.resetPassword,
  APP_ROUTES.activateAccount,
];

/** Router state the sign-in redirect carries: the portal page that was asked for. */
export interface SignInReturnState {
  from?: string;
}

/** The portal page a signed-out visitor opened (for example from an email link), to open after sign-in. */
export function returnPathAfterSignIn(state: unknown): string | null {
  const from = (state as SignInReturnState | null)?.from;
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return null;
  const path = from.split(/[?#]/)[0];
  return SIGN_IN_PAGES.includes(path) ? null : from;
}
