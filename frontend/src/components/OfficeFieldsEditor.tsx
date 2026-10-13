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
    <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
      <div>
        <p className="text-[10px] font-extrabold text-amber-800 tracking-wider uppercase">Office-Filled Fields</p>
        <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
          Details the portal does not hold, such as attendance from another system. The office types them in when it
          approves a request. Click a field to insert its tag.
        </p>
      </div>

      {fields.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Office-filled fields">
          {fields.map((field) => (
            <li
              key={field.name}
              className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-100/70 text-amber-900 shadow-3xs"
            >
              <button
                type="button"
                onClick={() => onInsert(`{{${field.name}}}`)}
                title={field.hint || `Insert {{${field.name}}}`}
                className="pl-3 pr-2 py-1.5 text-[10px] font-extrabold tracking-wide cursor-pointer hover:text-amber-950"
              >
                + {field.label} <span className="font-mono font-bold text-amber-700">{`{{${field.name}}}`}</span>
              </button>
              <button
                type="button"
                onClick={() => removeField(field)}
                aria-label={`Remove the field ${field.label}`}
                className="mr-1 p-1 rounded text-amber-700 hover:bg-amber-200/70 cursor-pointer"
              >
                <X aria-hidden="true" className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
        <label className="sm:col-span-4 block">
          <span className="sr-only">Field label</span>
          <input
            type="text"
            value={label}
            maxLength={MAX_LABEL}
            onChange={(e) => {
              setLabel(e.target.value);
              setError(null);
            }}
            placeholder="Label, e.g. Attendance (%)"
            className="form-control form-control-sm"
          />
        </label>
        <label className="sm:col-span-3 block">
          <span className="sr-only">Tag name</span>
          <input
            type="text"
            value={tagName}
            maxLength={40}
            onChange={(e) => {
              setName(e.target.value.toUpperCase().replace(/[^A-Z_]/g, ''));
              setNameEdited(true);
              setError(null);
            }}
            placeholder="TAG_NAME"
            className="form-control form-control-sm font-mono"
          />
        </label>
        <label className="sm:col-span-3 block">
          <span className="sr-only">Hint for the office (optional)</span>
          <input
            type="text"
            value={hint}
            maxLength={MAX_HINT}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Hint (optional)"
            className="form-control form-control-sm"
          />
        </label>
        <PortalButton size="sm" icon={Plus} onClick={addField} className="sm:col-span-2 h-[38px]">
          Add
        </PortalButton>
      </div>

      {(error || problem) && (
        <p role="alert" className="text-[11px] font-bold text-rose-600">{error ?? problem}</p>
      )}
    </div>
  );
};
