/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { AlertMessage } from './AlertMessage';
import { PasswordChangeForm } from './PasswordChangeForm';

interface ForcedPasswordChangeProps {
  userName: string;
  onChanged: () => void;
  onLogout: () => void;
}

export const ForcedPasswordChange: React.FC<ForcedPasswordChangeProps> = ({
  userName,
  onChanged,
  onLogout,
}) => {
  const [error, setError] = useState<string | null>(null);

  return (
    <div id="forced-password-change" className="w-full max-w-[490px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.08)] border border-slate-100 p-8 md:p-10 flex flex-col">
      <div className="w-14 h-14 bg-[#0c1424] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0c1424]/20 mb-6 self-center">
        <KeyRound className="w-5 h-5 text-indigo-300" />
      </div>
      <h2 className="text-[26px] font-extrabold text-[#0c1424] tracking-tight text-center">
        Change your password
      </h2>
      <p className="text-slate-500 text-sm mt-1 text-center font-medium">
        {userName}, your account needs a new password before you can continue.
      </p>

      {error && (
        <div className="mt-5">
          <AlertMessage type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      <PasswordChangeForm
        idPrefix="forced"
        submitLabel="Set New Password"
        onChanged={onChanged}
        onError={setError}
      />

      <button
        type="button"
        onClick={onLogout}
        className="mt-4 self-center text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
      >
        Sign out instead
      </button>
    </div>
  );
};
