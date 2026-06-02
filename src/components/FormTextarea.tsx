/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  id,
  label,
  error,
  className = '',
  rows = 4,
  ...props
}) => {
  return (
    <div id={`textarea-wrapper-${id}`} className="w-full flex flex-col text-left mb-5">
      <label id={`textarea-label-${id}`} htmlFor={id} className="form-label block">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        className={`form-control form-control-md resize-y min-h-[120px] ${error ? 'form-control-error' : ''} ${className}`}
        {...props}
      />
      {error && (
        <span id={`textarea-err-${id}`} className="text-xs text-red-500 mt-1.5 font-medium">
          {error}
        </span>
      )}
    </div>
  );
};
