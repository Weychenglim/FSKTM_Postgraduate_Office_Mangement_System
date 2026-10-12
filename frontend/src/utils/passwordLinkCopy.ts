/**
 * Wording for the page an activation or password reset email opens. It matches
 * the emails (accounts/account_emails.py): activation links have no time
 * limit, reset links expire after 30 minutes, and both work only once.
 */

export type PasswordLinkKind = 'activation' | 'reset';

export interface PasswordLinkCopy {
  formTitle: string;
  formSubtitle: string;
  passwordLabel: string;
  confirmLabel: string;
  submitLabel: string;
  note: string;
  doneTitle: string;
  doneSubtitle: string;
  doneAction: string;
  invalidTitle: string;
  invalidSubtitle: string;
  invalidNote?: string;
  invalidAction: string;
}

export const PASSWORD_LINK_COPY: Record<PasswordLinkKind, PasswordLinkCopy> = {
  activation: {
    formTitle: 'Activate Your Account',
    formSubtitle: 'Choose a password to finish setting up your FSKTM Postgraduate Office account.',
    passwordLabel: 'Password',
    confirmLabel: 'Confirm Password',
    submitLabel: 'Activate Account',
    note: 'This link does not expire. It stops working once you have set your password.',
    doneTitle: 'Account Activated',
    doneSubtitle:
      'Your password has been set. You can now sign in with your email or student ID and your new password.',
    doneAction: 'Go to Sign In',
    invalidTitle: 'Link No Longer Valid',
    invalidSubtitle:
      'This activation link can no longer be used. This usually means your account is already active, so please sign in with your password.',
    invalidNote:
      'If you have never set a password, please contact the FSKTM Postgraduate Office for a new activation link.',
    invalidAction: 'Go to Sign In',
  },
  reset: {
    formTitle: 'Set a New Password',
    formSubtitle: 'Choose a strong new password for your FSKTM Postgraduate Office account.',
    passwordLabel: 'New Password',
    confirmLabel: 'Confirm New Password',
    submitLabel: 'Reset Password',
    note: 'For your security, this link expires 30 minutes after it was sent and works only once.',
    doneTitle: 'Password Updated',
    doneSubtitle: 'Your password has been changed. You can now sign in with your new password.',
    doneAction: 'Back to Sign In',
    invalidTitle: 'Link No Longer Valid',
    invalidSubtitle:
      'This password reset link has expired or has already been used. Please request a new link to reset your password.',
    invalidAction: 'Request a New Link',
  },
};
