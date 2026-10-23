/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Who a confirmation letter is for, as in Maya: the purpose, then the bank,
// agency or company from a built-in list (searched as the student types), the
// address to print, and the optional details to show.

import React, { useState } from 'react';
import { SelectMenu } from './SelectMenu';
import { LoadingState, ErrorState } from './StateViews';
import type { LetterRecipientOptions, LetterRequestDetails } from '../types';

const TYPE_IT = '__type_it__';

interface LetterRecipientFieldsProps {
  options: LetterRecipientOptions | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  details: LetterRequestDetails;
  onChange: (details: LetterRequestDetails) => void;
  errors: Record<string, string>;
  disabled: boolean;
}

const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? <p id={id} role="alert" className="text-[10.5px] font-semibold text-rose-600">{message}</p> : null;

export const LetterRecipientFields: React.FC<LetterRecipientFieldsProps> = ({
  options,
  loading,
  error,
  onRetry,
  details,
  onChange,
  errors,
  disabled,
}) => {
  const purpose = options?.purposes.find((option) => option.code === details.purpose) ?? null;
  const listed = purpose?.organisations ?? [];
  const inList = listed.some((name) => name.toLowerCase() === details.organisation.trim().toLowerCase());
  const [typing, setTyping] = useState(() => Boolean(details.organisation) && !inList);
  const typeIt = typing || (purpose !== null && listed.length === 0);

  if (loading) return <LoadingState message="Loading the list of organisations…" />;
  if (error || !options) return <ErrorState message={error ?? 'Could not load the list of organisations.'} onRetry={onRetry} />;

  const set = (changes: Partial<LetterRequestDetails>) => onChange({ ...details, ...changes });
  const toggle = (code: string) =>
    set({ include: details.include.includes(code) ? details.include.filter((item) => item !== code) : [...details.include, code] });
  const input = (field: keyof LetterRequestDetails, label: string, placeholder = '', className = '') => {
    const id = `letter-recipient-${field}`;
    return (
      <div className={`space-y-1 ${className}`}>
        <label htmlFor={id} className="form-label block">{label}</label>
        <input
          id={id}
          type="text"
          value={String(details[field] ?? '')}
          maxLength={120}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => set({ [field]: event.target.value })}
          aria-invalid={errors[field] ? true : undefined}
          aria-describedby={errors[field] ? `${id}-error` : undefined}
          className={`form-control form-control-md ${errors[field] ? 'form-control-error' : ''}`}
        />
        <FieldError id={`${id}-error`} message={errors[field]} />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="letter-recipient-purpose" className="form-label block">What is the letter for?</label>
        <SelectMenu
          id="letter-recipient-purpose"
          value={details.purpose}
          placeholder="Choose a purpose"
          options={options.purposes.map((option) => ({ value: option.code, label: option.label }))}
          disabled={disabled}
          aria-invalid={errors.purpose ? true : undefined}
          aria-describedby={errors.purpose ? 'letter-recipient-purpose-error' : undefined}
          onChange={(code) => {
            if (code === details.purpose) return;
            setTyping(false);
            set({ purpose: code, organisation: '' });
          }}
        />
        <FieldError id="letter-recipient-purpose-error" message={errors.purpose} />
      </div>

      {purpose && (
        <>
          <div className="space-y-1">
            <label htmlFor="letter-recipient-organisation" className="form-label block">{purpose.organisationLabel}</label>
            {typeIt ? (
              <input
                id="letter-recipient-organisation"
                type="text"
                value={details.organisation}
                maxLength={160}
                disabled={disabled}
                placeholder={`Full name of the ${purpose.organisationLabel.toLowerCase()}`}
                onChange={(event) => set({ organisation: event.target.value })}
                aria-invalid={errors.organisation ? true : undefined}
                aria-describedby={errors.organisation ? 'letter-recipient-organisation-error' : undefined}
                className={`form-control form-control-md ${errors.organisation ? 'form-control-error' : ''}`}
              />
            ) : (
              <SelectMenu
                id="letter-recipient-organisation"
                value={inList ? listed.find((name) => name.toLowerCase() === details.organisation.trim().toLowerCase()) ?? '' : ''}
                placeholder={`Choose the ${purpose.organisationLabel.toLowerCase()}`}
                searchPlaceholder="Type to search"
                options={[
                  ...listed.map((name) => ({ value: name, label: name })),
                  { value: TYPE_IT, label: 'Not in the list? Type the name' },
                ]}
                disabled={disabled}
                aria-invalid={errors.organisation ? true : undefined}
                aria-describedby={errors.organisation ? 'letter-recipient-organisation-error' : undefined}
                onChange={(name) => {
                  if (name === TYPE_IT) {
                    setTyping(true);
                    set({ organisation: '' });
                  } else {
                    set({ organisation: name });
                  }
                }}
              />
            )}
            {typing && listed.length > 0 && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setTyping(false);
                  set({ organisation: '' });
                }}
                className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Choose from the list instead
              </button>
            )}
            <FieldError id="letter-recipient-organisation-error" message={errors.organisation} />
          </div>

          <fieldset className="space-y-3">
            <legend className="form-label">Address on the letter <span className="font-semibold text-slate-400">(optional)</span></legend>
            {input('addressLine1', 'Address line 1', 'For example: the branch name')}
            {input('addressLine2', 'Address line 2')}
            <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-3">
              {input('postcode', 'Postcode')}
              {input('city', 'City')}
            </div>
            {input('state', 'State or country')}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="form-label">Also show on the letter <span className="font-semibold text-slate-400">(optional)</span></legend>
            {options.optionalDetails.map((option) => (
              <label key={option.code} className="flex items-center gap-2.5 text-[12.5px] font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-[18px] w-[18px] accent-brand-navy"
                  checked={details.include.includes(option.code)}
                  disabled={disabled}
                  onChange={() => toggle(option.code)}
                />
                {option.label}
              </label>
            ))}
            <FieldError id="letter-recipient-include-error" message={errors.include} />
          </fieldset>
        </>
      )}
    </div>
  );
};
