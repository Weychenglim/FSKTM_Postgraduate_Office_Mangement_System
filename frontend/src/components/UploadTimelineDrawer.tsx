import React, { useEffect, useRef, useState } from 'react';
import { Download, UploadCloud } from 'lucide-react';
import { RecordPage } from './RecordPage';
import { PortalButton, PortalToast } from './PortalPrimitives';
import { TimelineEntry, TimelineUploadPreview } from '../types';
import { downloadTimelineTemplate, previewTimelineFile, saveBlob, timelineEntryToLegacy, uploadTimelineFile } from '../services';
import { validateTimelineUploadFile } from '../utils/timelineUploadValidation';

interface UploadTimelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (events: TimelineEntry[], importedCount?: number) => void;
  semesterId: number;
  semesterLabel: string;
}

export const UploadTimelineDrawer: React.FC<UploadTimelineDrawerProps> = ({ isOpen, onClose, onImportSuccess, semesterId, semesterLabel }) => {
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

  if (!isOpen) return null;
  return <RecordPage title="Import Timeline" backLabel="Back to Timeline Management" onBack={onClose} pageKey="timeline-import" dirty={!!file} busy={busy}>{requestBack =>
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <PortalToast message={message} />
      <div><span className="form-label">Target semester</span><p className="card-value">{semesterLabel}</p></div>
      <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 space-y-2">
        <p className="card-description">Preview checks the workbook without changing the timeline. Confirm replaces this semester’s current timeline with the reviewed rows.</p>
        <p className="card-description">Template rows are informational. Existing operational periods must be selected explicitly with Activity Code and Period ID columns; linked dates are managed by the owning module.</p>
        <PortalButton variant="ghost" icon={Download} onClick={download} disabled={busy}>Download Template</PortalButton>
      </div>
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
      {preview && <div className="space-y-4" aria-label="Import preview">
        <p className="card-value">{preview.importedCount} entries ready for confirmation. No changes have been saved.</p>
        {preview.warnings.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <ul className="list-disc pl-5 text-sm">{preview.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
          {preview.requiresAcknowledgement && <label className="flex gap-2 text-sm"><input type="checkbox" checked={acknowledged} disabled={busy} onChange={event => setAcknowledged(event.target.checked)} />I have reviewed and acknowledge these warnings.</label>}
        </div>}
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Level</th><th>Event</th><th>Start</th><th>End</th><th>Link</th></tr></thead>
          <tbody>{preview.rows.map(row => <tr key={`${row.level}-${row.step}`} className="border-t border-slate-100"><td>{row.level}</td><td>{row.title}</td><td>{row.deadlineStart}</td><td>{row.deadlineEnd}</td><td>{row.marksPeriodId ? `Marks period ${row.marksPeriodId}` : row.operationalPeriodId ? `Operational period ${row.operationalPeriodId}` : 'Informational'}</td></tr>)}</tbody></table></div>
      </div>}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
        <PortalButton variant="secondary" disabled={busy} onClick={requestBack}>Cancel</PortalButton>
        <PortalButton variant="primary" disabled={!file || busy} isLoading={busy && !preview} onClick={handlePreview}>Preview</PortalButton>
        {preview && <PortalButton variant="success" disabled={busy || (preview.requiresAcknowledgement && !acknowledged)} isLoading={busy} onClick={handleConfirm}>Confirm Import</PortalButton>}
      </div>
    </section>
  }</RecordPage>;
};
