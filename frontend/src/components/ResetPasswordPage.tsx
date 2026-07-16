/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, Check, ShieldCheck } from 'lucide-react';
import { authApi } from '../services';
import { authenticationErrorMessage } from '../utils/authErrorMessage';
import {
  AuthLayout,
  AuthCard,
  BackLink,
  FormInput,
  ActionButton,
  InfoMessage,
  FooterText,
} from './ForgotPasswordFlow';

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
    <AuthLayout>
      <BackLink onClick={onBackToLogin} className="mb-2 pl-1 text-[#2563eb] self-start" />

      {!isDone ? (
        <AuthCard id="reset-password-card" badgeIcon={Lock}>
          <h2 className="text-xl sm:text-2xl font-black text-[#0c1424] tracking-tight font-sans">
            Set a New Password
          </h2>
          <p className="text-[11.5px] sm:text-[12px] text-slate-500 font-bold mt-1.5 mb-8 leading-relaxed font-sans px-2">
            Choose a strong new password for your FSKTM Postgraduate Office account.
          </p>

          <form onSubmit={handleSubmit} className="w-full text-left">
            <FormInput
              id="new-password"
              label="New Password"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errorText || undefined}
              autoComplete="new-password"
              required
            />
            <FormInput
              id="confirm-password"
              label="Confirm New Password"
              type="password"
              icon={ShieldCheck}
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />

            <ActionButton type="submit" isLoading={isLoading} className="mt-2">
              Reset Password
            </ActionButton>
          </form>

          <InfoMessage message="For your security this reset link can be used once and expires 30 minutes after it was sent." />
          <FooterText />
        </AuthCard>
      ) : (
        <AuthCard id="reset-success-card" badgeIcon={Check} badgeCircle>
          <h2 className="text-xl sm:text-2xl font-black text-[#0c1424] tracking-tight font-sans">
            Password Updated
          </h2>
          <div className="text-slate-600 text-xs sm:text-[12.5px] leading-relaxed font-semibold mt-4 mb-6 font-sans px-1">
            Your password has been reset successfully. You can now sign in with your new password.
          </div>

          <ActionButton type="button" onClick={onBackToLogin}>
            Back to Sign In
          </ActionButton>

          <FooterText />
        </AuthCard>
      )}
    </AuthLayout>
  );
};
