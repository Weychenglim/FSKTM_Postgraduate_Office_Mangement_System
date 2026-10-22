import React, { useState } from 'react';
import type { SemesterCapacityPlan } from '../types';
import { PortalButton } from './PortalPrimitives';
import { PortalSelect } from './PortalSelect';

interface Props {
  drafts: SemesterCapacityPlan[];
  published: SemesterCapacityPlan | null;
  previous: SemesterCapacityPlan | null;
  checkingPrevious: boolean;
  disabled: boolean;
  busy: boolean;
  onCheckPrevious: () => void;
  onContinue: (plan: SemesterCapacityPlan) => void;
  onCurrent: () => void;
  onCreate: (source: SemesterCapacityPlan | null) => void;
}

export function CapacityPreparationForm({ drafts, published, previous, checkingPrevious, disabled, busy, onCheckPrevious, onContinue, onCurrent, onCreate }: Props) {
  const [mode, setMode] = useState<'continue' | 'new'>(drafts.length ? 'continue' : 'new');
  const [draftId, setDraftId] = useState(drafts[0]?.id ?? null);
  const [source, setSource] = useState(published ? 'current' : 'blank');
  const draft = drafts.find(row => row.id === draftId) ?? drafts[0];
  const canSubmit = !disabled && (mode === 'continue' ? !!draft : source !== 'previous' || !!previous && !checkingPrevious);
  return <form className="capacity-preparation-form" onSubmit={event => {
    event.preventDefault();
    if (!canSubmit) return;
    if (mode === 'continue' && draft) onContinue(draft);
    else if (source === 'current') onCurrent();
    else onCreate(source === 'previous' ? previous : null);
  }}>
    <p className="capacity-preparation-intro">Choose a draft to continue, or select a starting point for a new one. Published limits stay in force until you publish a replacement.</p>
    <fieldset disabled={disabled} className="capacity-preparation-fields">
      <legend className="section-heading">What would you like to do?</legend>
      <div className="capacity-preparation-modes">
        <label><input type="radio" name="capacity-preparation-mode" value="continue" checked={mode === 'continue'} disabled={!drafts.length} onChange={() => setMode('continue')} /><span>Continue an existing draft{!drafts.length && <small>No active drafts</small>}</span></label>
        <label><input type="radio" name="capacity-preparation-mode" value="new" checked={mode === 'new'} onChange={() => setMode('new')} /><span>Start a new draft</span></label>
      </div>
      {mode === 'continue' ? <div className="capacity-preparation-choice">
        <label htmlFor="capacity-existing-draft" className="capacity-field-label">Draft</label>
        <PortalSelect id="capacity-existing-draft" className="form-control form-control-md" value={draft?.id ?? ''} onChange={event => setDraftId(Number(event.target.value))}>{drafts.map(row => <option key={row.id} value={row.id}>Version {row.version} · Created {new Date(row.createdAt).toLocaleDateString('en-MY')}</option>)}</PortalSelect>
        {draft && <p className="capacity-preparation-description">{draft.entries.length} lecturer entries · {draft.readinessErrors.length ? `${draft.readinessErrors.length} issues remaining` : 'Ready for publication review'}.<br />Created by {draft.createdBy.name}. Draft limits are not in force.</p>}
      </div> : <div className="capacity-preparation-choice">
        <label htmlFor="capacity-draft-source" className="capacity-field-label">Starting point</label>
        <PortalSelect id="capacity-draft-source" className="form-control form-control-md" value={source} onChange={event => { const value = event.target.value; setSource(value); if (value === 'previous') onCheckPrevious(); }}>
          {published && <option value="current">Current published limits</option>}
          <option value="previous">Previous semester</option>
          <option value="blank">Blank draft</option>
        </PortalSelect>
        <div className="capacity-preparation-description" aria-live="polite">
          {source === 'current' && <p>Creates an editable copy of Version {published?.version}. Published limits stay unchanged.</p>}
          {source === 'blank' && <p>Creates a draft with no limits filled in. Configure every eligible lecturer before publishing.</p>}
          {source === 'previous' && (checkingPrevious ? <p>Checking the latest eligible published plan…</p> : previous ? <p>Copies {previous.semesterLabel}, Version {previous.version}. Review the copied limits against current lecturer roles.</p> : <p>No eligible previous published plan. Choose another starting point.</p>)}
        </div>
      </div>}
    </fieldset>
    <div className="capacity-preparation-footer"><PortalButton type="submit" variant="primary" disabled={!canSubmit} isLoading={busy}>{mode === 'continue' ? 'Continue editing' : 'Create draft'}</PortalButton></div>
  </form>;
}
