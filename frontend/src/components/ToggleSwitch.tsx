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
  /** Ids of text already on screen that names and describes the switch; no label is repeated beside it. */
  labelledBy?: string;
  describedBy?: string;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  labelledBy,
  describedBy,
  className = ''
}) => {
  return (
    <div id={`toggle-container-${id}`} className={`flex items-center gap-3.5 select-none py-2 ${className}`}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 shrink-0 rounded-full transition-colors relative duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-navy/20 ${
          checked ? 'bg-brand-navy' : 'bg-slate-200'
        }`}
      >
        <span
          className={`w-4 h-4 rounded-full bg-white absolute top-0.5 left-0.5 transition-transform duration-200 shadow-sm ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      {label && !labelledBy && (
        <span id={`toggle-label-${id}`} className="text-xs font-bold text-slate-700">
          {label}
        </span>
      )}
    </div>
  );
};
