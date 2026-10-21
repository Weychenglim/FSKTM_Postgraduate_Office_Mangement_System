/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// A template's office-filled fields: values the office types in when it
// approves a letter request, for details the portal does not hold (attendance
// worked out in another system, for example). Each field becomes a tag such as
// {{ATTENDANCE}} that can be placed in the letter like any other placeholder.

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { PortalButton } from './PortalPrimitives';
import { LetterCustomField } from '../types';
import { fieldNameFromLabel, fieldNameProblem } from '../utils/letterDocument';

const MAX_FIELDS = 20;
const MAX_LABEL = 80;
const MAX_HINT = 200;

interface OfficeFieldsEditorProps {
  fields: LetterCustomField[];
  onChange: (fields: LetterCustomField[]) => void;
  /** Put the field's tag into the letter at the cursor. */
  onInsert: (tag: string) => void;
  /** Whether the letter's wording uses this tag, so removing it needs the tag gone too. */
  isUsed: (tag: string) => boolean;
  problem?: string;
  onMessage: (message: string) => void;
}

export const OfficeFieldsEditor: React.FC<OfficeFieldsEditorProps> = ({
  fields,
  onChange,
  onInsert,
  isUsed,
  problem,
  onMessage,
}) => {
  const [label, setLabel] = useState('');
  const [name, setName] = useState('');
  // The tag follows the label until it is edited by hand.
  const [nameEdited, setNameEdited] = useState(false);
  const [hint, setHint] = useState('');
  const [error, setError] = useState<string | null>(null);

  const taken = fields.map((field) => field.name);
  const suggestedName = label.trim() ? fieldNameFromLabel(label, taken) : '';
  const tagName = nameEdited ? name : suggestedName;

  const addField = () => {
    const cleanLabel = label.trim();
    if (!cleanLabel) {
      setError('Give the field a label, for example "Attendance (%)".');
      return;
    }
    if (fields.length >= MAX_FIELDS) {
      setError(`A template can have at most ${MAX_FIELDS} office-filled fields.`);
      return;
    }
    const problemWithName = fieldNameProblem(tagName, taken);
    if (problemWithName) {
      setError(problemWithName);
      return;
    }
    onChange([...fields, { name: tagName, label: cleanLabel, hint: hint.trim() }]);
    onInsert(`{{${tagName}}}`);
    setLabel('');
    setName('');
    setNameEdited(false);
    setHint('');
    setError(null);
  };

  const removeField = (field: LetterCustomField) => {
    onChange(fields.filter((item) => item.name !== field.name));
    if (isUsed(`{{${field.name}}}`)) {
      onMessage(`Removed ${field.label}. Take {{${field.name}}} out of the letter too, or the template cannot be saved.`);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="section-label">Office-filled fields</h3>
        <p className="card-description mt-1">
          Details the portal does not hold, such as attendance from another system. The office types them in when it
          approves the letter.
        </p>
      </div>

      {fields.length > 0 ? (
        <ul className="rounded-xl border border-slate-200" aria-label="Office-filled fields">
          {fields.map((field) => (
            <li key={field.name} className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-800">{field.label}</p>
                <p className="text-[11px] font-semibold text-slate-400">
                  <code>{`{{${field.name}}}`}</code>
                  {field.hint ? ` · ${field.hint}` : ''}
                </p>
              </div>
              <PortalButton size="sm" icon={Plus} onClick={() => onInsert(`{{${field.name}}}`)}>
                Insert
              </PortalButton>
              <button
                type="button"
                onClick={() => removeField(field)}
                aria-label={`Remove the field ${field.label}`}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-600 cursor-pointer"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-[12px] font-semibold text-slate-400">
          No office-filled fields. Add one below if the letter needs a detail the portal does not hold.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="office-field-label" className="form-label block">Label</label>
          <input
            id="office-field-label"
            type="text"
            value={label}
            maxLength={MAX_LABEL}
            onChange={(e) => {
              setLabel(e.target.value);
              setError(null);
            }}
            placeholder="For example: Attendance (%)"
            className="form-control form-control-md"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="office-field-tag" className="form-label block">Tag name</label>
          <input
            id="office-field-tag"
            type="text"
            value={tagName}
            maxLength={40}
            onChange={(e) => {
              setName(e.target.value.toUpperCase().replace(/[^A-Z_]/g, ''));
              setNameEdited(true);
              setError(null);
            }}
            placeholder="Filled in from the label"
            className="form-control form-control-md font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="office-field-hint" className="form-label block">Hint for the office (optional)</label>
          <input
            id="office-field-hint"
            type="text"
            value={hint}
            maxLength={MAX_HINT}
            onChange={(e) => setHint(e.target.value)}
            placeholder="For example: From the attendance system"
            className="form-control form-control-md"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {error || problem ? (
          <p role="alert" className="text-[11px] font-bold text-rose-600">{error ?? problem}</p>
        ) : (
          <p className="text-[11px] font-semibold text-slate-400">Adding a field also puts its tag in the letter at the cursor.</p>
        )}
        <PortalButton icon={Plus} onClick={addField}>
          Add field
        </PortalButton>
      </div>
    </div>
  );
};
