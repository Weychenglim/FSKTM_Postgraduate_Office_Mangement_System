/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Check,
  Eye,
  Bold,
  Italic,
  Underline,
  List,
  Image as ImageIcon,
  CheckCircle,
  HelpCircle,
  Clock,
  User,
  SlidersHorizontal,
  RefreshCcw,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, PortalButton, PortalConfirmModal, PortalToast, SegmentedControl, StatusBadge } from './PortalPrimitives';
import { LoadingState, ErrorState } from './StateViews';
import { SelectMenu } from './SelectMenu';
import { IssuedLettersRegister } from './IssuedLetters';
import { OfficeFieldsEditor } from './OfficeFieldsEditor';
import { OfficeLetterRequests } from './OfficeLetterRequests';
import { LetterCustomField, LetterPlaceholder, LetterRequestCounts, LetterTemplate, LetterTemplateStatus } from '../types';
import {
  LETTER_PLACEHOLDERS,
  LETTERHEAD,
  findPlaceholderProblems,
  renderLetterBodyHtml,
} from '../utils/letterDocument';
import {
  fieldErrors,
  getLetterPlaceholders,
  getLetterTemplates,
  createLetterTemplate,
  updateLetterTemplate,
  deleteLetterTemplate,
  getLetterRequestCounts,
} from '../services';
import { THIN_SCROLLBAR } from '../utils/scrollbar';

const describePlaceholderProblems = ({ unknown, malformed }: { unknown: string[]; malformed: string[] }) =>
  [
    unknown.length ? `Unknown placeholder(s): ${unknown.join(', ')}.` : '',
    malformed.length ? `Malformed placeholder(s): ${malformed.join(', ')}. Write them as {{NAME}}.` : '',
  ].filter(Boolean).join(' ');

const LETTER_TYPES = ['Academic Certification', 'Visa & Immigration', 'General Notifications', 'Financial Clearance'];
const DEFAULT_REFERENCE_PREFIX = 'UMF/PG';

// Editor fields a 400 response can point at; anything else goes to the toast.
const EDITOR_FIELDS = ['name', 'description', 'referencePrefix', 'content', 'customFields'] as const;
type EditorField = (typeof EDITOR_FIELDS)[number];

type LeaveTarget = { kind: 'select'; template: LetterTemplate } | { kind: 'create' };

// Distinct placeholder tags used in a template body.
const countPlaceholdersUsed = (text: string) => new Set(text.match(/\{\{[A-Z_]+\}\}/g) ?? []).size;

// LetterTemplate now lives in src/types.

export type OfficeLetterView = 'templates' | 'requests' | 'issued';

const OFFICE_LETTER_VIEWS: readonly OfficeLetterView[] = ['templates', 'requests', 'issued'];

const PAGE_SUBTITLE: Record<OfficeLetterView, string> = {
  templates: 'Create and manage official letter templates for the postgraduate office.',
  requests: 'Letters students have asked for. Fill in what the portal does not hold, then approve or reject each one.',
  issued: 'Every letter issued to students, with its reference number. Open any letter to view it exactly as it was issued.',
};

interface LetterTemplateManagementProps {
  /** Office staff also get the letter requests and the register of issued letters. */
  canViewIssuedLetters?: boolean;
  /** Which tab is open; driven by the route when the app provides it. */
  view?: OfficeLetterView;
  onViewChange?: (view: OfficeLetterView) => void;
  /** The request open for review on the Requests tab, from the route. */
  requestId?: string | null;
  onOpenRequest?: (id: string) => void;
  onCloseRequest?: () => void;
}

export const LetterTemplateManagement: React.FC<LetterTemplateManagementProps> = ({
  canViewIssuedLetters = false,
  view,
  onViewChange,
  requestId,
  onOpenRequest,
  onCloseRequest,
}) => {
  const [localView, setLocalView] = useState<OfficeLetterView>('templates');
  const [localRequestId, setLocalRequestId] = useState<string | null>(null);
  const activeView: OfficeLetterView = canViewIssuedLetters ? view ?? localView : 'templates';
  const showIssued = activeView === 'issued';
  const showRequests = activeView === 'requests';
  const changeView = (next: OfficeLetterView) => (onViewChange ? onViewChange(next) : setLocalView(next));
  const openRequestId = onOpenRequest ? requestId ?? null : localRequestId;

  // How many requests wait for a decision, for the tab label.
  const [requestCounts, setRequestCounts] = useState<LetterRequestCounts | null>(null);
  const loadRequestCounts = useCallback(() => {
    if (!canViewIssuedLetters) return;
    getLetterRequestCounts().then(setRequestCounts).catch(() => setRequestCounts(null));
  }, [canViewIssuedLetters]);
  useEffect(() => {
    loadRequestCounts();
  }, [loadRequestCounts]);

  // Toast notifications state
  const [toast, setToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Templates loaded from lettersApi (mock-backed today).
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected state
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  // Editable Form Inputs matching the current selection
  const [editorName, setEditorName] = useState('');
  const [editorType, setEditorType] = useState('');
  const [editorDescription, setEditorDescription] = useState('');
  const [editorPrefix, setEditorPrefix] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorStatus, setEditorStatus] = useState<LetterTemplateStatus>('Active');
  const [editorFields, setEditorFields] = useState<LetterCustomField[]>([]);
  const [problems, setProblems] = useState<Partial<Record<EditorField, string>>>({});
  const [showArchived, setShowArchived] = useState(false);
  const [placeholders, setPlaceholders] = useState<LetterPlaceholder[] | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<LeaveTarget | null>(null);

  const clearProblem = (field: EditorField) =>
    setProblems((current) => (current[field] ? { ...current, [field]: undefined } : current));

  // Editor textarea ref + the caret position to restore after inserting a tag,
  // so a placeholder lands at the cursor (not the end) and the caret follows it.
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursorRef = useRef<number | null>(null);

  const loadTemplates = useCallback(() => {
    setLoading(true);
    setError(null);
    getLetterTemplates()
      .then((data) => {
        setTemplates(data);
        setSelectedTemplate((current) => current ?? data[0] ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load letter templates.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    getLetterPlaceholders().then(setPlaceholders).catch(() => setPlaceholders(null));
  }, []);

  const loadEditor = (template: LetterTemplate) => {
    setEditorName(template.name);
    setEditorType(template.type);
    setEditorDescription(template.description);
    setEditorPrefix(template.referencePrefix ?? '');
    setEditorContent(template.content ?? '');
    setEditorFields(template.customFields ?? []);
    setEditorStatus(template.status);
    setProblems({});
  };

  // Load the editor when a different template is selected. Keyed on the id, so
  // saving (same template, fresh copy) never wipes what is being typed.
  const selectedId = selectedTemplate?.id;
  useEffect(() => {
    if (selectedTemplate) loadEditor(selectedTemplate);
  }, [selectedId]);

  const isDirty =
    !!selectedTemplate &&
    (editorName !== selectedTemplate.name ||
      editorType !== selectedTemplate.type ||
      editorDescription !== selectedTemplate.description ||
      editorPrefix !== (selectedTemplate.referencePrefix ?? '') ||
      editorContent !== (selectedTemplate.content ?? '') ||
      JSON.stringify(editorFields) !== JSON.stringify(selectedTemplate.customFields ?? []) ||
      editorStatus !== selectedTemplate.status);

  // After an inserted tag changes the content, refocus the textarea and move the
  // caret to just after the tag (no-op for normal typing; the ref stays null then).
  useEffect(() => {
    if (pendingCursorRef.current === null) return;
    const cursor = pendingCursorRef.current;
    pendingCursorRef.current = null;
    const textarea = editorTextareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    }
  }, [editorContent]);

  // Available placeholder tags come from the server's registry, the same list
  // it validates against; the local copy covers the moment before it loads.
  const placeholderTags = (
    placeholders ?? LETTER_PLACEHOLDERS.map((p) => ({ ...p, source: '' }))
  ).map((p) => ({
    label: `+ ${p.label}`,
    tag: p.tag,
    source: p.source,
  }));

  // Quick Insertion Helper: insert the tag at the caret (or over the current
  // selection), not at the end. Falls back to appending if the textarea ref is
  // somehow unavailable.
  const handleInsertTag = (tag: string) => {
    const textarea = editorTextareaRef.current;
    const start = textarea?.selectionStart ?? editorContent.length;
    const end = textarea?.selectionEnd ?? editorContent.length;

    const before = editorContent.slice(0, start);
    const after = editorContent.slice(end);
    // Pad with a single space only where the tag would otherwise touch a word.
    const lead = before.length && !/\s$/.test(before) ? ' ' : '';
    const trail = after.length && !/^\s/.test(after) ? ' ' : '';
    const insertion = `${lead}${tag}${trail}`;

    setEditorContent(before + insertion + after);
    // Place the caret just after the inserted tag once React has re-rendered.
    pendingCursorRef.current = before.length + insertion.length;
    triggerToast(`Inserted placeholder tag: ${tag}`);
  };

  // Actions, persisted through the letters API.
  const handleSaveTemplate = async () => {
    if (!selectedTemplate || saving) return;
    if (!editorName.trim()) {
      setProblems((current) => ({ ...current, name: 'Please enter a template name.' }));
      triggerToast('Error: Please enter a template name.');
      return;
    }

    const submitted = {
      name: editorName,
      type: editorType,
      description: editorDescription,
      referencePrefix: editorPrefix,
      content: editorContent,
      customFields: editorFields,
      status: editorStatus,
    };
    setSaving(true);
    try {
      const updated = await updateLetterTemplate(selectedTemplate.id, {
        ...submitted,
        name: submitted.name.trim(),
        referencePrefix: submitted.referencePrefix.trim(),
      });
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTemplate(updated);
      // Take the saved value of each field, unless it was edited while saving.
      setEditorName((current) => (current === submitted.name ? updated.name : current));
      setEditorType((current) => (current === submitted.type ? updated.type : current));
      setEditorDescription((current) => (current === submitted.description ? updated.description : current));
      setEditorPrefix((current) => (current === submitted.referencePrefix ? updated.referencePrefix ?? '' : current));
      setEditorContent((current) => (current === submitted.content ? updated.content ?? '' : current));
      setEditorFields((current) => (current === submitted.customFields ? updated.customFields ?? [] : current));
      setEditorStatus((current) => (current === submitted.status ? updated.status : current));
      setProblems({});
      triggerToast(`Template "${updated.name}" saved.`);
    } catch (e) {
      const errors = fieldErrors(e);
      setProblems(Object.fromEntries(EDITOR_FIELDS.filter((field) => errors[field]).map((field) => [field, errors[field]])));
      triggerToast(`Save failed: ${e instanceof Error ? e.message : 'please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  const createTemplate = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const created = await createLetterTemplate({
        name: 'New Custom Letter Template',
        type: 'Academic Certification',
        status: 'Draft',
        description: 'Custom letters drafted for secretariat administration.',
        content: 'To Whom It May Concern,\n\nWrite your template body here using {{STUDENT_NAME}}.',
      });
      setTemplates((prev) => [created, ...prev]);
      setSelectedTemplate(created);
      triggerToast('Created a new draft template.');
    } catch (e) {
      triggerToast(e instanceof Error ? `Create failed: ${e.message}` : 'Create failed.');
    } finally {
      setSaving(false);
    }
  };

  // Switching away from unsaved edits asks first.
  const requestSelect = (template: LetterTemplate) => {
    if (saving || template.id === selectedTemplate?.id) return;
    if (isDirty) setPendingLeave({ kind: 'select', template });
    else setSelectedTemplate(template);
  };

  const requestCreate = () => {
    if (saving) return;
    if (isDirty) setPendingLeave({ kind: 'create' });
    else void createTemplate();
  };

  const confirmLeave = () => {
    const target = pendingLeave;
    setPendingLeave(null);
    if (target?.kind === 'select') setSelectedTemplate(target.template);
    else if (target?.kind === 'create') void createTemplate();
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate || saving) return;
    const deleted = selectedTemplate;
    setSaving(true);
    try {
      await deleteLetterTemplate(deleted.id);
      setTemplates((prev) => prev.filter((t) => t.id !== deleted.id));
      setSelectedTemplate(null);
      triggerToast(`Deleted "${deleted.name}".`);
    } catch (e) {
      triggerToast(e instanceof Error ? `Delete failed: ${e.message}` : 'Delete failed.');
    } finally {
      setConfirmingDelete(false);
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (!selectedTemplate) return;
    loadEditor(selectedTemplate);
    triggerToast('Reverted unsaved changes back to the saved template.');
  };

  const handleCheckPlaceholders = () => {
    const message = describePlaceholderProblems(findPlaceholderProblems(editorContent, editorFields.map((f) => f.name)));
    if (message) {
      setProblems((current) => ({ ...current, content: message }));
      triggerToast(message);
      return;
    }
    clearProblem('content');
    const used = countPlaceholdersUsed(editorContent);
    triggerToast(`All ${used} placeholder${used === 1 ? '' : 's'} in this template are supported.`);
  };

  // Wrap the current selection (or insert a stub) with a markup marker, e.g.
  // **bold**, *italic*, __underline__. The wrapped text stays selected so the
  // author can immediately re-style or keep typing.
  const wrapSelection = (marker: string, label: string) => {
    const textarea = editorTextareaRef.current;
    const start = textarea?.selectionStart ?? editorContent.length;
    const end = textarea?.selectionEnd ?? editorContent.length;
    const selected = editorContent.slice(start, end) || label;
    const before = editorContent.slice(0, start);
    const after = editorContent.slice(end);

    setEditorContent(`${before}${marker}${selected}${marker}${after}`);
    // Re-select the inner text (between the markers) after re-render.
    pendingCursorRef.current = before.length + marker.length + selected.length;
    triggerToast(`Applied ${label} formatting.`);
  };

  // Turn the current line(s) into a bullet list (toggles a "- " prefix).
  const toggleBulletList = () => {
    const textarea = editorTextareaRef.current;
    const selStart = textarea?.selectionStart ?? 0;
    const selEnd = textarea?.selectionEnd ?? 0;
    const lineStart = editorContent.lastIndexOf('\n', selStart - 1) + 1;
    let lineEnd = editorContent.indexOf('\n', selEnd);
    if (lineEnd === -1) lineEnd = editorContent.length;

    const before = editorContent.slice(0, lineStart);
    const block = editorContent.slice(lineStart, lineEnd);
    const after = editorContent.slice(lineEnd);
    const allBulleted = block.split('\n').every((l) => l.trim() === '' || /^\s*-\s+/.test(l));
    const newBlock = block
      .split('\n')
      .map((l) => (l.trim() === '' ? l : allBulleted ? l.replace(/^\s*-\s+/, '') : `- ${l}`))
      .join('\n');

    setEditorContent(before + newBlock + after);
    pendingCursorRef.current = (before + newBlock).length;
    triggerToast(allBulleted ? 'Removed bullet list.' : 'Formatted as a bullet list.');
  };

  // Filter computation
  const query = searchQuery.trim().toLowerCase();
  const archivedCount = templates.filter(t => t.status === 'Archived').length;
  const filteredTemplates = templates.filter(t =>
    (showArchived || t.status !== 'Archived') && (
      t.name.toLowerCase().includes(query) ||
      t.type.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    )
  );

  const typeOptions = editorType && !LETTER_TYPES.includes(editorType) ? [...LETTER_TYPES, editorType] : LETTER_TYPES;
  const referencePreview = `${(editorPrefix.trim() || DEFAULT_REFERENCE_PREFIX).replace(/\/+$/, '')}/${new Date().getFullYear()}/####`;

  return (
    <div id="letter-template-management" className="space-y-8 text-left font-sans text-brand-navy text-xs pb-16 animate-fade-in">

      <PortalToast message={toast} />

      {!(showRequests && openRequestId) && (
        <>
          <PageHeader title="Letter Generation" subtitle={PAGE_SUBTITLE[activeView]} />

          {canViewIssuedLetters && (
            <SegmentedControl
              options={OFFICE_LETTER_VIEWS}
              value={activeView}
              onChange={(next) => {
                if (next === 'requests') loadRequestCounts();
                changeView(next);
              }}
              labels={{
                templates: 'Templates',
                requests: requestCounts?.Pending ? `Requests (${requestCounts.Pending})` : 'Requests',
                issued: 'Issued Letters',
              }}
              className="w-fit"
            />
          )}
        </>
      )}

      {showRequests && (
        <OfficeLetterRequests
          requestId={openRequestId}
          onOpenRequest={(id) => (onOpenRequest ? onOpenRequest(id) : setLocalRequestId(id))}
          onCloseRequest={() => (onCloseRequest ? onCloseRequest() : setLocalRequestId(null))}
          counts={requestCounts}
          onCountsStale={loadRequestCounts}
          onMessage={triggerToast}
        />
      )}

      {showIssued && <IssuedLettersRegister onMessage={triggerToast} />}

      {/* Main Grid containing left and right pane cards. Kept mounted while the
          register is open so unsaved template edits survive a tab switch. */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start ${activeView !== 'templates' ? 'hidden' : ''}`}>
        
        {/* LEFT COLUMN: TEMPLATES LIBRARY (lg:col-span-4) */}
        <div id="templates-library-column" className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 text-left shadow-3xs">

            {/* Library Panel Header */}
            <div className="flex items-center justify-between">
              <h2 className="section-label">Templates Library</h2>
              <span className="text-[11px] font-semibold text-slate-400">
                {templates.length} template{templates.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Filter searching bar */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search by name or type..."
                value={searchQuery}
                aria-label="Filter templates"
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control form-control-sm pl-9 pr-3"
              />
            </div>

            {archivedCount > 0 && (
              <button
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                {showArchived ? 'Hide archived templates' : `Show archived templates (${archivedCount})`}
              </button>
            )}

            {/* Template Card Buttons list */}
            <div className={`space-y-3 max-h-[580px] overflow-y-auto pr-1 ${THIN_SCROLLBAR}`}>
              {loading ? (
                <LoadingState message="Loading templates…" />
              ) : error ? (
                <ErrorState message={error} onRetry={loadTemplates} />
              ) : filteredTemplates.length === 0 ? (
                <div className="card-value py-8 text-center">
                  No matching templates found.
                </div>
              ) : (
                filteredTemplates.map((tpl) => {
                  const isSelected = selectedTemplate?.id === tpl.id;
                  const isActive = tpl.status === 'Active';
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => requestSelect(tpl)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer block ${
                        isSelected 
                          ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-905 shadow-3xs' 
                          : 'bg-white border-slate-200 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-xs truncate max-w-[180px]">
                          {tpl.name}
                        </span>
                        
                        {/* Status chip */}
                        <StatusBadge
                          tone={isActive ? 'brand' : tpl.status === 'Archived' ? 'warning' : 'neutral'}
                          className="px-2 py-0.5 text-[8px] rounded-md"
                        >
                          {tpl.status}
                        </StatusBadge>
                      </div>

                      {/* Description blurb */}
                      <p className="text-[10px] text-slate-450 font-medium leading-relaxed mt-1.5 line-clamp-2">
                        {tpl.description}
                      </p>

                      {/* Footer log details */}
                      <div className="mt-3 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{tpl.lastModified}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          <span>{tpl.modifiedBy}</span>
                        </div>
                      </div>

                    </button>
                  );
                })
              )}
            </div>

            {/* Create a new template on the backend */}
            <PortalButton
              type="button"
              disabled={saving}
              onClick={requestCreate}
              variant="secondary"
              size="md"
              icon={Plus}
              fullWidth
            >
              Create New Template
            </PortalButton>

          </div>
        </div>

        {/* RIGHT COLUMN: TEMPLATE EDITOR (lg:col-span-8) */}
        <div id="template-editor-column" className="lg:col-span-8 space-y-4">
          {!selectedTemplate ? (
            !loading && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center shadow-3xs">
                <FileText className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="mt-3 text-sm font-black text-slate-700">No template selected</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  Choose a template from the library, or create a new one.
                </p>
              </div>
            )
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-3xs text-left">

              {/* Core editor forms wrapper container */}
              <div className="p-6 md:p-8 space-y-6">

                <div className="flex items-center gap-3 select-none">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-brand-navy" />
                  </div>
                  <div>
                    <h2 className="section-label">Template Editor</h2>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      Edit the wording, placeholders and status of the selected template.
                    </p>
                  </div>
                </div>
              
                {/* Row 1: Template Name & Letter Type drop downs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                  {/* Template Name input */}
                  <div className="space-y-1.5">
                    <label htmlFor="letter-template-name" className="form-label block">
                      Template Name
                    </label>
                    <input
                      id="letter-template-name"
                      type="text"
                      value={editorName}
                      maxLength={255}
                      onChange={(e) => {
                        setEditorName(e.target.value);
                        clearProblem('name');
                      }}
                      aria-invalid={problems.name ? true : undefined}
                      aria-describedby={problems.name ? 'letter-template-name-error' : undefined}
                      className="form-control form-control-md"
                      placeholder="Enter descriptive template title..."
                    />
                    {problems.name && (
                      <p id="letter-template-name-error" role="alert" className="text-[11px] font-bold text-rose-600">
                        {problems.name}
                      </p>
                    )}
                  </div>

                  {/* Letter Type custom selection dropdown */}
                  <div className="space-y-1.5">
                    <label htmlFor="letter-template-type" className="form-label block">
                      Letter Type
                    </label>
                    <SelectMenu
                      id="letter-template-type"
                      value={editorType}
                      options={typeOptions.map((type) => ({ value: type, label: type }))}
                      onChange={setEditorType}
                    />
                  </div>

                </div>

                {/* Row 1b: what students see in the template list, and the reference number prefix */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="letter-template-description" className="form-label block">
                      Short Description
                    </label>
                    <input
                      id="letter-template-description"
                      type="text"
                      value={editorDescription}
                      maxLength={500}
                      onChange={(e) => {
                        setEditorDescription(e.target.value);
                        clearProblem('description');
                      }}
                      aria-invalid={problems.description ? true : undefined}
                      aria-describedby={problems.description ? 'letter-template-description-error' : undefined}
                      className="form-control form-control-md"
                      placeholder="What this letter is for..."
                    />
                    {problems.description && (
                      <p id="letter-template-description-error" role="alert" className="text-[11px] font-bold text-rose-600">{problems.description}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="letter-template-prefix" className="form-label block">
                      Reference Prefix
                    </label>
                    <input
                      id="letter-template-prefix"
                      type="text"
                      value={editorPrefix}
                      maxLength={64}
                      onChange={(e) => {
                        setEditorPrefix(e.target.value);
                        clearProblem('referencePrefix');
                      }}
                      aria-invalid={problems.referencePrefix ? true : undefined}
                      aria-describedby={problems.referencePrefix ? 'letter-template-prefix-error' : 'letter-template-prefix-hint'}
                      className="form-control form-control-md"
                      placeholder={DEFAULT_REFERENCE_PREFIX}
                    />
                    {problems.referencePrefix ? (
                      <p id="letter-template-prefix-error" role="alert" className="text-[11px] font-bold text-rose-600">{problems.referencePrefix}</p>
                    ) : (
                      <p id="letter-template-prefix-hint" className="text-[10px] font-semibold text-slate-400">
                        Letters are numbered {referencePreview}; the last digits are issued when the office approves a request.
                      </p>
                    )}
                  </div>
                </div>

                {/* Row 2: Placeholder Tag insertions block */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between select-none">
                    <label className="form-label block">
                      Placeholder Tags
                    </label>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">
                      Click to insert at cursor position
                    </span>
                  </div>

                  {/* Horizontal tags block list */}
                  <div className="flex flex-wrap gap-2">
                    {placeholderTags.map((p) => (
                      <button
                        key={p.tag}
                        type="button"
                        onClick={() => handleInsertTag(p.tag)}
                        title={p.source || undefined}
                        className="px-3 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] border border-blue-200 text-blue-700 hover:text-blue-800 text-[10px] font-extrabold tracking-wide rounded-lg transition duration-150 cursor-pointer inline-flex items-center gap-1 shadow-3xs"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 2b: values the office types in when it approves a request */}
                <OfficeFieldsEditor
                  fields={editorFields}
                  onChange={(fields) => {
                    setEditorFields(fields);
                    clearProblem('customFields');
                  }}
                  onInsert={handleInsertTag}
                  isUsed={(tag) => editorContent.includes(tag)}
                  problem={problems.customFields}
                  onMessage={triggerToast}
                />

                {/* Simulated RTF Editor Window Area starting with rich toolbar */}
                <div className="border border-slate-205 rounded-xl overflow-hidden bg-white shadow-3xs">
                
                  {/* Formatting Tools Panel bar header */}
                  <div className="bg-slate-50 border-b border-slate-205 px-4 py-2 flex items-center justify-between select-none">
                    <div className="flex items-center gap-1">
                    
                      <button
                        type="button"
                        onClick={() => wrapSelection('**', 'bold')}
                        className="p-1.5 rounded hover:bg-slate-200/65 text-slate-500 hover:text-slate-950 transition"
                        title="Bold (**text**)"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => wrapSelection('*', 'italic')}
                        className="p-1.5 rounded hover:bg-slate-200/65 text-slate-500 hover:text-slate-950 transition"
                        title="Italic (*text*)"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => wrapSelection('__', 'underline')}
                        className="p-1.5 rounded hover:bg-slate-200/65 text-slate-500 hover:text-slate-950 transition"
                        title="Underline (__text__)"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>

                      {/* Splitter bar line separator */}
                      <div className="w-px h-4 bg-slate-250 mx-1.5" />

                      <button
                        type="button"
                        onClick={toggleBulletList}
                        className="p-1.5 rounded hover:bg-slate-200/65 text-slate-500 transition"
                        title="Bullet list (- item)"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerToast('The official faculty letterhead is applied automatically to every letter.')}
                        className="p-1.5 rounded hover:bg-slate-200/65 text-slate-500 transition"
                        title="Faculty letterhead (applied automatically)"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>

                    </div>

                    <div className="text-[10px] text-slate-400 font-bold">
                      **bold** · *italic* · __underline__ · - list
                    </div>
                  </div>

                  {/* Edit Area Input Textarea */}
                  <textarea
                    ref={editorTextareaRef}
                    rows={8}
                    value={editorContent}
                    onChange={(e) => {
                      setEditorContent(e.target.value);
                      clearProblem('content');
                    }}
                    aria-label="Letter content"
                    aria-invalid={problems.content ? true : undefined}
                    aria-describedby={problems.content ? 'letter-template-content-error' : undefined}
                    className="w-full p-4 text-xs font-semibold text-slate-705 placeholder:text-slate-400 bg-slate-500/5 focus:outline-none focus:bg-white resize-none leading-relaxed transition"
                    placeholder="Draft your main letter content using placeholder keys..."
                  />

                </div>

                {problems.content && (
                  <p id="letter-template-content-error" role="alert" className="-mt-4 text-[11px] font-bold text-rose-600">
                    {problems.content}
                  </p>
                )}

                {/* Dynamic Simulated A4 Document sheet Paper Block exactly as in layout mockup */}
                <div className="border border-slate-200 rounded-xl bg-slate-100/70 p-4">
                
                  {/* A4 Paper mockup layout */}
                  <div className="bg-white border border-slate-250/60 rounded p-6 shadow-sm relative min-h-[380px] text-left text-[11px] text-slate-700 leading-relaxed font-sans max-w-2xl mx-auto">
                  
                    {/* Faculty official letterhead: the fixed institutional header,
                        shared with the student preview and the printed letter. */}
                    <div className="border-b-2 border-double border-slate-800 pb-3 mb-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 select-none">
                        <img
                          src={LETTERHEAD.logoPath}
                          alt="Universiti Malaya"
                          className="h-12 w-auto object-contain"
                        />
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-tight block max-w-[130px]">
                          {LETTERHEAD.faculty}
                        </span>
                      </div>
                      <div className="text-right text-[8px] font-bold text-slate-400 leading-relaxed max-w-[200px] select-none">
                        {LETTERHEAD.addressLines.map((line) => (
                          <span key={line} className="block">{line}</span>
                        ))}
                      </div>
                    </div>

                    {/* Reference and date, laid out as on the printed letter */}
                    <div className="flex justify-between items-baseline gap-4 font-semibold text-slate-600 mb-5">
                      <div>
                        Our Ref:{' '}
                        <span className="bg-brand-navy text-[#a5b4fc] text-[9.5px] px-1.5 py-0.5 rounded font-mono font-black">
                          {referencePreview}
                        </span>
                      </div>
                      <div>
                        Date:{' '}
                        <span className="bg-brand-navy text-[#a5b4fc] text-[9.5px] px-1.5 py-0.5 rounded font-mono font-black">
                          {"{{CURRENT_DATE}}"}
                        </span>
                      </div>
                    </div>

                    {/* Main Formed dynamic document body preview (markup rendered;
                        placeholders highlighted so the author can see their tags).
                        The salutation is part of the body, exactly as it prints. */}
                    {editorContent.trim() ? (
                      <div
                        className="leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: renderLetterBodyHtml(editorContent, {
                            highlightPlaceholders: true,
                            officeFields: editorFields.map((f) => f.name),
                          }),
                        }}
                      />
                    ) : (
                      <p className="text-slate-400 italic">No message content drafted yet...</p>
                    )}

                    <p className="text-slate-500 font-semibold text-[10px] leading-relaxed select-none mt-5">
                      {LETTERHEAD.disclaimer}
                    </p>

                    {/* Signature Dean footer stamp line block */}
                    <div className="mt-8 pt-6 border-t border-slate-100 text-left space-y-1">
                      <div className="w-24 border-b border-slate-400 h-6 select-none" />
                      <p className="font-extrabold text-slate-950 block">{LETTERHEAD.signatoryName}</p>
                      <p className="text-slate-450 uppercase tracking-wide text-[9px] font-black leading-none select-none">
                        {LETTERHEAD.signatoryOffice}
                      </p>
                    </div>

                  </div>

                </div>

                {/* Bottom statistics dashboard indicators card block inside editor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                  {/* Mini card: Placeholders used count */}
                  <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl flex items-center justify-between text-left select-none">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                        Placeholders Used
                      </span>
                      <p className="text-xl font-extrabold text-brand-navy mt-1 leading-none">
                        {countPlaceholdersUsed(editorContent)}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
                      <Sparkles className="w-4 h-4 animate-spin-slow" />
                    </div>
                  </div>

                  {/* Mini card: Template status control */}
                  <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl flex items-center justify-between text-left">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                        Template Status
                      </span>
                    
                      {/* Select box block inside */}
                      <div className="relative mt-1">
                        <select
                          aria-label="Template Status Option"
                          value={editorStatus}
                          onChange={(e) => setEditorStatus(e.target.value as LetterTemplateStatus)}
                          className="bg-transparent border-none text-xs font-black text-brand-navy hover:text-[#2563eb] appearance-none focus:outline-none pr-5 cursor-pointer leading-tight"
                        >
                          <option value="Active">● Active / Live</option>
                          <option value="Draft">● Draft / Sandbox</option>
                          <option value="Archived">● Archived / Retired</option>
                        </select>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  </div>

                </div>

                {/* Action buttons row block */}
                <div className="border-t border-slate-100 pt-5 flex flex-col md:flex-row items-center justify-between gap-4">

                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <PortalButton variant="secondary" size="md" onClick={handleDiscardChanges} disabled={!isDirty || saving}>
                      Discard Changes
                    </PortalButton>
                    <PortalButton variant="danger" size="md" icon={Trash2} onClick={() => setConfirmingDelete(true)} disabled={saving}>
                      Delete
                    </PortalButton>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <PortalButton variant="secondary" size="md" onClick={handleCheckPlaceholders}>
                      Check Placeholders
                    </PortalButton>
                    <PortalButton variant="primary" size="md" icon={Check} onClick={handleSaveTemplate} disabled={saving}>
                      {saving ? 'Saving…' : 'Save Template'}
                    </PortalButton>
                  </div>

                </div>

              </div>

            </div>
          )}
        </div>

      </div>

      <PortalConfirmModal
        isOpen={confirmingDelete && selectedTemplate !== null}
        title="Delete this template?"
        message={
          selectedTemplate
            ? `"${selectedTemplate.name}" will be deleted permanently.${
                selectedTemplate.status === 'Active' ? ' Students will no longer be able to generate this letter.' : ''
              } To keep the wording but hide it from students, set its status to Archived instead.`
            : ''
        }
        confirmLabel="Delete"
        tone="danger"
        isLoading={saving}
        onConfirm={() => void handleDeleteTemplate()}
        onCancel={() => setConfirmingDelete(false)}
      />

      <PortalConfirmModal
        isOpen={pendingLeave !== null}
        title="Discard unsaved changes?"
        message={`Your changes to "${selectedTemplate?.name ?? 'this template'}" have not been saved.`}
        confirmLabel="Discard Changes"
        cancelLabel="Keep Editing"
        tone="warning"
        onConfirm={confirmLeave}
        onCancel={() => setPendingLeave(null)}
      />

    </div>
  );
};
