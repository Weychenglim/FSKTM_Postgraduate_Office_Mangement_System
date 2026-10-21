/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Select } from './Select';

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  options: Option[];
  error?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  id,
  label,
  options,
  error,
  className = '',
  ...props
}) => {
  return (
    <div id={`select-wrapper-${id}`} className="w-full flex flex-col text-left mb-5">
      <label id={`select-label-${id}`} htmlFor={id} className="form-label block">
        {label}
      </label>
      <div className="relative">
        <Select
          id={id}
          className={`form-control form-control-md ${error ? 'form-control-error' : ''} ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
      {error && (
        <span id={`select-err-${id}`} className="card-description text-red-500 mt-1.5">
          {error}
        </span>
      )}
    </div>
  );
};
