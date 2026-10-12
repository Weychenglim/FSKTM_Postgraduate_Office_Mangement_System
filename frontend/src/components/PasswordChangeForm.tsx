/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import * as authApi from '../services/authApi';
import { FormInput } from './FormInput';
import { PortalButton } from './PortalPrimitives';

interface PasswordChangeFormProps {
  idPrefix: string;
  submitLabel?: string;
  onChanged: () => void;
  onError?: (message: string) => void;
}

export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({
  idPrefix,
  submitLabel = 'Update Password',
  onChanged,
  onError,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwErrors, setPwErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof pwErrors = {};
    if (!currentPassword) errors.current = 'Enter your current password.';
    if (newPassword.length < 8) errors.next = 'Use at least 8 characters.';
    if (confirmPassword !== newPassword) errors.confirm = 'Passwords do not match.';
    setPwErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update password.';
      // "Your current password is incorrect." belongs under Current Password,
      // not New Password — anything else is a rule about the new value.
      const isCurrentPasswordError = /current password/i.test(message);
      setPwErrors(isCurrentPasswordError ? { current: message } : { next: message });
      onError?.(message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <form onSubmit={handleSavePassword} className="mt-5">
      <FormInput
        id={`${idPrefix}-current-pw`}
        label="Current Password"
        type="password"
        icon={KeyRound}
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        error={pwErrors.current}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-4">
        <FormInput
          id={`${idPrefix}-new-pw`}
          label="New Password"
          type="password"
          icon={KeyRound}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={pwErrors.next}
        />
        <FormInput
          id={`${idPrefix}-confirm-pw`}
          label="Confirm New Password"
          type="password"
          icon={KeyRound}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={pwErrors.confirm}
        />
      </div>
      <div className="flex justify-end">
        <PortalButton type="submit" variant="primary" size="md" icon={Save} disabled={savingPassword}>
          {savingPassword ? 'Saving…' : submitLabel}
        </PortalButton>
      </div>
    </form>
  );
};
