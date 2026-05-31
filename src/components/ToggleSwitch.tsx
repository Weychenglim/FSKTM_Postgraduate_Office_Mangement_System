/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  label
}) => {
  return (
    <div id={`toggle-container-${id}`} className="flex items-center gap-3.5 select-none py-2">
      <button
        id={id}
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 shrink-0 rounded-full transition-colors relative duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform duration-200 shadow-sm ${
            checked ? 'translate-x-5.5' : 'translate-x-0.5'
          }`}
        />
      </button>
      {label && (
        <span id={`toggle-label-${id}`} className="text-xs font-bold text-slate-700">
          {label}
        </span>
      )}
    </div>
  );
};
