/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, Check, Lock } from 'lucide-react';
import { authApi } from '../services';
import { authenticationErrorMessage } from '../utils/authErrorMessage';
import { AuthCard, AuthScreen, BackLink, InfoMessage } from './ForgotPasswordFlow';
import { PasswordInput } from './PasswordInput';
import { PortalButton } from './PortalPrimitives';

interface ResetPasswordPageProps {
  /** From the email link: `?uid=...&token=...`. */
  uid: string;
  token: string;
  onBackToLogin: () => void;
}

/**
 * "Set a new password" screen. Opened when the app loads with a reset link in
 * the URL (see App.tsx). Submits the uid + token + new password to the backend.
 */
export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  uid,
  token,
  onBackToLogin,
}) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (password.length < 8) {
      setErrorText('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setErrorText('The two passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.confirmPasswordReset(uid, token, password);
      setIsDone(true);
    } catch (err) {
      setErrorText(authenticationErrorMessage(
        err,
        'Cannot reach the server. Please try again shortly.',
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreen>
      <BackLink onClick={onBackToLogin} />

      <div className="mt-10">
        {!isDone ? (
          <AuthCard
            id="reset-password-card"
            badgeIcon={Lock}
            title="Set a New Password"
            subtitle="Choose a strong new password for your FSKTM Postgraduate Office account."
          >
            <form onSubmit={handleSubmit} className="w-full text-left">
              <PasswordInput
                id="new-password"
                label="New Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errorText || undefined}
                autoComplete="new-password"
                required
              />
              <PasswordInput
                id="confirm-password"
                label="Confirm New Password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />

              <PortalButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                icon={ArrowRight}
                iconPosition="right"
                className="mt-1"
              >
                Reset Password
              </PortalButton>
            </form>

            <InfoMessage message="For your security this reset link can be used once and expires 30 minutes after it was sent." />
          </AuthCard>
        ) : (
          <AuthCard
            id="reset-success-card"
            badgeIcon={Check}
            badgeCircle
            title="Password Updated"
            subtitle="Your password has been reset successfully. You can now sign in with your new password."
          >
            <PortalButton
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              icon={ArrowRight}
              iconPosition="right"
              onClick={onBackToLogin}
            >
              Back to Sign In
            </PortalButton>
          </AuthCard>
        )}
      </div>
    </AuthScreen>
  );
};
