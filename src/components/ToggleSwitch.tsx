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
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  className = ''
}) => {
  return (
    <div id={`toggle-container-${id}`} className={`flex items-center gap-3.5 select-none py-2 ${className}`}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-10 h-5.5 shrink-0 rounded-full transition-colors relative duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-navy/20 ${
          checked ? 'bg-brand-navy' : 'bg-slate-200'
        }`}
      >
        <span
          className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform duration-200 shadow-xs ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
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
