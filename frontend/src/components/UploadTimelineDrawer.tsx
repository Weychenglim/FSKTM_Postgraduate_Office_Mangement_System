import React, { useEffect, useRef, useState } from 'react';
import { Download, UploadCloud } from 'lucide-react';
import { RecordPage } from './RecordPage';
import { PortalButton } from './PortalPrimitives';
import { AlertMessage } from './AlertMessage';
import { TimelineEntry, TimelineUploadPreview } from '../types';
import { downloadTimelineTemplate, previewTimelineFile, saveBlob, timelineEntryToLegacy, uploadTimelineFile } from '../services';
import { validateTimelineUploadFile } from '../utils/timelineUploadValidation';

interface UploadTimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (events: TimelineEntry[], importedCount?: number) => void;
  semesterId: number;
  semesterLabel: string;
  embedded?: boolean;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}

export const UploadTimelineDrawer: React.FC<UploadTimelineDrawerProps> = ({ isOpen, onClose, onImportSuccess, semesterId, semesterLabel, embedded = false, onCancel, onDirtyChange, onBusyChange }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<TimelineUploadPreview | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);

  useEffect(() => {
    generation.current += 1;
    setFile(null);
    setPreview(null);
    setAcknowledged(false);
    setMessage(null);
    setBusy(false);
  }, [semesterId, isOpen]);

  const chooseFile = (candidate: File | null) => {
    if (busy) return;
    generation.current += 1;
    setPreview(null);
    setAcknowledged(false);
    const error = candidate && validateTimelineUploadFile(candidate);
    setFile(error ? null : candidate);
    setMessage(error || null);
  };

  const handlePreview = async () => {
    if (!file || busy) return;
    const current = generation.current;
    setBusy(true);
    setPreview(null);
    setAcknowledged(false);
    setMessage(null);
    try {
      const result = await previewTimelineFile(file, semesterId);
      if (generation.current === current) setPreview(result);
    } catch (error) {
      if (generation.current === current) setMessage(error instanceof Error ? error.message : 'Preview failed.');
    } finally {
      if (generation.current === current) setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!file || !preview || busy || (preview.requiresAcknowledgement && !acknowledged)) return;
    const current = generation.current;
    setBusy(true);
    setMessage(null);
    try {
      const result = await uploadTimelineFile(file, semesterId, preview.previewToken, acknowledged);
      if (generation.current !== current) return;
      onImportSuccess?.(result.timeline.levels.flatMap(group => group.entries.map(timelineEntryToLegacy)), result.importedCount);
      setFile(null);
      setPreview(null);
      onClose();
    } catch (error) {
      if (generation.current === current) {
        setMessage(error instanceof Error ? error.message : 'Import failed. Preview the workbook again.');
        setPreview(null);
        setAcknowledged(false);
      }
    } finally {
      if (generation.current === current) setBusy(false);
    }
  };

  const download = async () => {
    try {
      saveBlob(await downloadTimelineTemplate(semesterId), 'FSKTM_Semester_Timeline_Template.xlsx');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Template download failed.');
    }
  };

  useEffect(() => { onDirtyChange?.(!!file); }, [file, onDirtyChange]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  if (!isOpen) return null;
  const renderImport = (requestBack: () => void) =>
    <section className={embedded ? "space-y-5" : "space-y-5 rounded-2xl border border-slate-200 bg-white p-5"}>

      <AlertMessage type="warning" title="Import replaces this semester’s timeline" message="Preview the file and review its events before confirming. Previewing makes no changes." />
      <div className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center space-y-3"
        onDragOver={event => event.preventDefault()}
        onDrop={event => { event.preventDefault(); chooseFile(event.dataTransfer.files[0] || null); }}>
        <UploadCloud className="mx-auto h-6 w-6 text-slate-500" />
        <input ref={input} type="file" aria-label="Timeline workbook" accept=".xlsx" disabled={busy} className="hidden"
          onChange={event => chooseFile(event.target.files?.[0] || null)} />
        <p className="card-description">{file ? file.name : 'Drop an Excel .xlsx workbook here (maximum 10 MB).'}</p>
        <PortalButton variant="secondary" onClick={() => input.current?.click()} disabled={busy}>Browse File</PortalButton>
        {file && <PortalButton variant="ghost" disabled={busy} onClick={() => { chooseFile(null); if (input.current) input.current.value = ''; }}>Clear Selected File</PortalButton>}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="card-description">Need the required format?</span><PortalButton variant="ghost" size="sm" icon={Download} onClick={download} disabled={busy}>Download template</PortalButton></div>
      <details className="text-sm text-slate-600">
        <summary className="cursor-pointer font-semibold">Importing linked submission or evaluation periods?</summary>
        <p className="mt-2 leading-relaxed">Select existing periods using the Activity Code and Period ID columns in the template. Manage their linked dates through submission windows or marks configuration.</p>
      </details>
      {preview && <div className="space-y-4" aria-label="Import preview">
        <p className="card-value">{preview.importedCount} entries ready for confirmation. No changes have been saved.</p>
        {preview.warnings.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <ul className="list-disc pl-5 text-sm">{preview.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
          {preview.requiresAcknowledgement && <label className="flex gap-2 text-sm"><input type="checkbox" checked={acknowledged} disabled={busy} onChange={event => setAcknowledged(event.target.checked)} />I have reviewed and acknowledge these warnings.</label>}
        </div>}
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Level</th><th>Event</th><th>Start</th><th>End</th><th>Link</th></tr></thead>
          <tbody>{preview.rows.map(row => <tr key={`${row.level}-${row.step}`} className="border-t border-slate-100"><td>{row.level}</td><td>{row.title}</td><td>{row.deadlineStart}</td><td>{row.deadlineEnd}</td><td>{row.marksPeriodId ? `Marks period ${row.marksPeriodId}` : row.operationalPeriodId ? `Operational period ${row.operationalPeriodId}` : 'Informational'}</td></tr>)}</tbody></table></div>
      </div>}
      {message && <AlertMessage type="error" title="Timeline import needs attention" message={message} />}
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
        <PortalButton variant="secondary" disabled={busy} onClick={requestBack}>Cancel</PortalButton>
        <PortalButton variant="primary" disabled={!file || busy} isLoading={busy && !preview} onClick={handlePreview}>Preview import</PortalButton>
        {preview && <PortalButton variant="success" disabled={busy || (preview.requiresAcknowledgement && !acknowledged)} isLoading={busy} onClick={handleConfirm}>Confirm Import</PortalButton>}
      </div>
    </section>
  ;
  return embedded ? renderImport(onCancel ?? onClose) : <RecordPage title="Import Timeline" subtitle={semesterLabel} backLabel="Back to Timeline Management" onBack={onClose} pageKey="timeline-import" dirty={!!file} busy={busy}>{renderImport}</RecordPage>;
};
