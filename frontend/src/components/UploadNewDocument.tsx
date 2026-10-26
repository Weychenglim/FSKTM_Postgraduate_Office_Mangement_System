/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import type { DocumentDetail, DocumentKind, DocumentOptions, DocumentSharing, StaffAudience, TaggableStudent } from '../types';
import { addDocumentVersion, getDocumentOptions, searchTaggableStudents, uploadConflict, uploadDocument } from '../services/filesApi';
import { ApiError, fieldErrors } from '../services/apiClient';
import { formatFileSize } from '../utils/documentDisplay';
import { defaultSharing, namesOrNone, sharingNames, STAFF_AUDIENCES, staffTypeChoices, studentAudienceSentence } from '../utils/documentSharing';
import { acceptAttribute, acceptedKinds, fileProblem, kindForName, kindsSentence, titleFromFileName } from '../utils/documentUpload';
import { PortalButton, PortalConfirmModal } from './PortalPrimitives';
import { RecordPage } from './RecordPage';
import { SelectMenu, SelectMenuOption } from './SelectMenu';
import { ErrorState, LoadingState } from './StateViews';
import { KindBadge, StudentPicker } from './DocumentParts';

interface UploadNewDocumentProps {
  onBack: () => void;
  onUploadSuccess: (document: DocumentDetail) => void;
  isStudent?: boolean;
  role?: string;
  initialStudent?: string;
  initialType?: string;
  initialFile?: File | null;
  onOpenExisting?: (documentId: number) => void;
}

const Section: React.FC<{ title?: string; htmlFor?: string; children: React.ReactNode }> = ({ title, htmlFor, children }) => (
  <div className="space-y-3 px-5 py-5 sm:px-6">
    {title && (htmlFor ? <label htmlFor={htmlFor} className="block text-[15px] font-extrabold text-brand-navy">{title}</label> : <h2 className="text-[15px] font-extrabold text-brand-navy">{title}</h2>)}
    {children}
  </div>
);

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? <p className="text-[13px] font-semibold text-rose-700">{message}</p> : null;

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

export const UploadNewDocument: React.FC<UploadNewDocumentProps> = ({
  onBack,
  onUploadSuccess,
  isStudent = false,
  role = '',
  initialStudent = '',
  initialType = '',
  initialFile = null,
  onOpenExisting,
}) => {
  const [options, setOptions] = useState<DocumentOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [file, setFile] = useState<File | null>(initialFile);
  const [dragging, setDragging] = useState(false);
  const [typeCode, setTypeCode] = useState('');
  const [students, setStudents] = useState<TaggableStudent[]>([]);
  const [staffFile, setStaffFile] = useState(false);
  const [share, setShare] = useState<DocumentSharing>({ supervisors: false, panel: false, coordinator: false });
  const [audience, setAudience] = useState<StaffAudience>('ACADEMIC');
  const [programme, setProgramme] = useState('');
  const [title, setTitle] = useState(initialFile ? titleFromFileName(initialFile.name) : '');
  const [titleEdited, setTitleEdited] = useState(false);
  const [semester, setSemester] = useState('');
  const [description, setDescription] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [existing, setExisting] = useState<{ detail: string; id?: number } | null>(null);
  const [duplicate, setDuplicate] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const done = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    getDocumentOptions()
      .then(found => {
        if (cancelled) return;
        setOptions(found);
        setSemester(found.currentSemester ? String(found.currentSemester.id) : 'none');
      })
      .catch(err => !cancelled && setLoadError(errorText(err, 'Could not load the upload form.')));
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    if (isStudent || !initialStudent) return;
    let cancelled = false;
    searchTaggableStudents(initialStudent)
      .then(found => {
        const match = found.find(student => student.matric.toLowerCase() === initialStudent.toLowerCase());
        if (!cancelled && match) setStudents(current => (current.length ? current : [match]));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [initialStudent, isStudent]);

  const types = useMemo(() => {
    if (!options) return [];
    if (isStudent) return options.types;
    return staffTypeChoices(options.types, { isOffice: options.isOffice, role, staffFile, students });
  }, [options, isStudent, role, staffFile, students]);
  const type = types.find(item => item.code === typeCode) ?? null;

  useEffect(() => {
    if (typeCode && !types.some(item => item.code === typeCode)) setTypeCode('');
  }, [types, typeCode]);

  const chooseType = (code: string) => {
    setTypeCode(code);
    setShare(defaultSharing(types.find(item => item.code === code)));
    setErrors(current => ({ ...current, type: '', file: '' }));
    setExisting(null);
  };

  const presetType = useRef(false);
  useEffect(() => {
    if (presetType.current || !initialType || !types.length) return;
    presetType.current = true;
    if (types.some(item => item.code === initialType)) chooseType(initialType);
  }, [types, initialType]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseFile = (chosen: File | null) => {
    setFile(chosen);
    setExisting(null);
    setErrors(current => ({ ...current, file: '' }));
    if (chosen && !titleEdited) setTitle(titleFromFileName(chosen.name));
  };

  const staff = !isStudent;
  const maxBytes = options?.maxBytes ?? 10 * 1024 * 1024;
  const clientProblem = file ? fileProblem(file, type, staff, maxBytes) : null;
  const names = sharingNames(students);
  const dirty = Boolean(file || typeCode || students.length || description.trim() || titleEdited);

  const submit = async (acknowledgeWarnings = false) => {
    const found: Record<string, string> = {};
    const problem = fileProblem(file, type, staff, maxBytes);
    if (problem) found.file = problem;
    if (!type) found.type = 'Choose what this file is.';
    if (staff && !staffFile && !students.length) found.students = 'Add at least one student, or upload it as a staff file.';
    setErrors(found);
    setBanner(null);
    if (Object.keys(found).length || !file || !type) return;
    setSubmitting(true);
    try {
      const document = await uploadDocument({
        file,
        type: type.code,
        title,
        description,
        semester: isStudent ? '' : semester,
        students: staffFile || isStudent ? [] : students.map(student => student.matric),
        share: staff && !staffFile ? share : undefined,
        audience: staffFile ? audience : undefined,
        programmes: staffFile && programme ? [programme] : [],
        acknowledgeWarnings,
      });
      done.current = true;
      onUploadSuccess(document);
    } catch (err) {
      const conflict = uploadConflict(err);
      if (conflict?.code === 'already_have_one') {
        setExisting({ detail: conflict.detail, id: conflict.existingDocumentId });
      } else if (conflict) {
        setDuplicate(conflict.warnings.length ? conflict.warnings : [conflict.detail]);
      } else if (err instanceof ApiError && err.status === 400) {
        setErrors(fieldErrors(err));
      } else {
        setBanner(errorText(err, 'Could not upload the file. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const addAsVersion = async (documentId: number) => {
    if (!file) return;
    setSubmitting(true);
    try {
      const document = await addDocumentVersion(documentId, file, description);
      done.current = true;
      onUploadSuccess(document);
    } catch (err) {
      setBanner(errorText(err, 'Could not add the new version.'));
    } finally {
      setSubmitting(false);
    }
  };

  const typeOptions: SelectMenuOption<string>[] = types.map(item => ({
    value: item.code,
    label: item.label,
    description: item.description || item.groupLabel,
    triggerLabel: item.label,
  }));
  const kinds = acceptedKinds(type, staff);
  const fallbackKinds: DocumentKind[] = staff ? ['PDF', 'DOCX', 'IMAGE', 'XLSX', 'PPTX'] : ['PDF', 'DOCX', 'IMAGE'];

  return (
    <RecordPage
      title="Upload a file"
      subtitle={isStudent ? 'Send a document to the PG office.' : 'Add an official document about your students, or a file for staff.'}
      backLabel={isStudent ? 'Back to File Submission' : 'Back to Files'}
      onBack={onBack}
      dirty={dirty}
      busy={submitting}
      navigationComplete={done}
    >
      {loadError ? (
        <ErrorState message={loadError} onRetry={() => setReload(value => value + 1)} />
      ) : !options ? (
        <LoadingState message="Loading the upload form..." />
      ) : (
        <form
          className="app-card divide-y divide-slate-100"
          noValidate
          onSubmit={event => {
            event.preventDefault();
            void submit();
          }}
        >
          {banner && (
            <div role="alert" className="flex items-start gap-3 bg-rose-50 px-6 py-4 text-[14px] font-semibold text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {banner}
            </div>
          )}

          <Section>
            <input
              ref={fileInput}
              id="document-file"
              type="file"
              className="sr-only"
              accept={acceptAttribute(kinds.length ? kinds : fallbackKinds)}
              onChange={event => chooseFile(event.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <KindBadge kind={kindForName(file.name)} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-brand-navy">{file.name}</p>
                    <p className="text-[12px] text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <PortalButton size="sm" type="button" onClick={() => fileInput.current?.click()}>Change file</PortalButton>
              </div>
            ) : (
              <div
                onDragOver={event => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={event => {
                  event.preventDefault();
                  setDragging(false);
                  chooseFile(event.dataTransfer.files?.[0] ?? null);
                }}
                className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${dragging ? 'border-brand-navy bg-indigo-50' : 'border-slate-300 bg-slate-50'}`}
              >
                <Upload className="h-7 w-7 text-slate-400" aria-hidden="true" />
                <p className="text-[14px] font-bold text-brand-navy">Drag your file here</p>
                <PortalButton size="sm" type="button" onClick={() => fileInput.current?.click()}>Browse</PortalButton>
                <p className="text-[12px] text-slate-500">
                  {type ? `${kindsSentence(kinds)}, up to ${formatFileSize(maxBytes)}` : `PDF, Word or a photo${staff ? ', Excel or PowerPoint' : ''}, up to ${formatFileSize(maxBytes)}`}
                </p>
              </div>
            )}
            <FieldError message={errors.file || clientProblem || undefined} />
          </Section>

          <Section title="What is it?">
            <SelectMenu<string>
              aria-label="What is it?"
              value={typeCode}
              options={typeOptions}
              placeholder={types.length ? 'Choose one' : 'No types you can upload here'}
              onChange={chooseType}
              disabled={!types.length}
            />
            <FieldError message={errors.type} />
            {isStudent && type && (
              <div className="space-y-1.5 rounded-xl bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
                <p>{studentAudienceSentence(type)}</p>
                {type.needsCheck && <p>The office checks this file and tells you when it is accepted, or what to fix.</p>}
              </div>
            )}
            {existing && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-900">
                <span>{existing.detail}</span>
                <span className="flex flex-wrap gap-2">
                  {existing.id && onOpenExisting && <PortalButton size="sm" type="button" onClick={() => onOpenExisting(existing.id!)}>Open it</PortalButton>}
                  {existing.id && file && <PortalButton size="sm" type="button" variant="primary" isLoading={submitting} onClick={() => void addAsVersion(existing.id!)}>Add as a new version</PortalButton>}
                </span>
              </div>
            )}
          </Section>

          {staff && (
            staffFile ? (
              <Section title="Who can see it?">
                <p className="text-[13px] text-slate-600">A staff file is not about any student. Students never see it; to send a file to students, use an announcement.</p>
                <fieldset className="space-y-1">
                  <legend className="sr-only">Who can see it</legend>
                  {STAFF_AUDIENCES.map(item => (
                    <label key={item.value} className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-2.5">
                      <input type="radio" name="audience" className="mt-0.5 h-5 w-5 accent-brand-navy" checked={audience === item.value} onChange={() => setAudience(item.value)} />
                      <span>
                        <span className="block text-[14px] font-bold text-slate-800">{item.label}</span>
                        <span className="block text-[12px] text-slate-500">{item.hint}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                {audience !== 'OFFICE' && (
                  <SelectMenu<string>
                    aria-label="Programme"
                    variant="filter"
                    prefix="Programme"
                    value={programme}
                    options={[{ value: '', label: 'All programmes', triggerLabel: 'All' }, ...(options.programmes ?? []).map(item => ({ value: item, label: item }))]}
                    onChange={setProgramme}
                  />
                )}
                <button type="button" className="text-[13px] font-bold text-blue-700 hover:text-blue-900" onClick={() => setStaffFile(false)}>
                  It is about a student after all
                </button>
              </Section>
            ) : (
              <>
                <Section title="Which students is it about?" htmlFor="document-students">
                  <StudentPicker inputId="document-students" picked={students} onChange={setStudents} />
                  <FieldError message={errors.students} />
                  <button type="button" className="text-[13px] font-bold text-blue-700 hover:text-blue-900" onClick={() => setStaffFile(true)}>
                    Not about a student? Upload it as a staff file
                  </button>
                </Section>
                <Section title="Share with">
                  {([
                    ['supervisors', 'Supervisors', namesOrNone(names.supervisors, students.length ? 'No other supervisors' : 'The supervisors of the students you add')],
                    ['panel', 'Panel member', namesOrNone(names.panel, students.length ? 'No panel member yet' : 'The panel member of the students you add')],
                    ['coordinator', 'Programme coordinator', namesOrNone(names.coordinators, students.length ? 'None' : 'The coordinator of each student’s programme')],
                  ] as const).map(([key, label, people]) => (
                    <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-2">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-5 w-5 accent-brand-navy"
                        checked={share[key]}
                        onChange={() => setShare(current => ({ ...current, [key]: !current[key] }))}
                      />
                      <span>
                        <span className="block text-[14px] font-bold text-slate-800">{label}</span>
                        <span className="block text-[13px] text-slate-500">{people}</span>
                      </span>
                    </label>
                  ))}
                  <p className="text-[12px] text-slate-500">The PG office always sees uploads. Students never see staff uploads.</p>
                </Section>
              </>
            )
          )}

          {isStudent && (
            <Section title="Title" htmlFor="document-title">
              <input id="document-title" className="form-control form-control-md text-[14px]" value={title} maxLength={200} placeholder="Filled in from the file name" onChange={event => {
                setTitle(event.target.value);
                setTitleEdited(true);
              }} />
              <FieldError message={errors.title} />
            </Section>
          )}

          <Section>
            <button type="button" aria-expanded={moreOpen} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-blue-700 hover:text-blue-900" onClick={() => setMoreOpen(open => !open)}>
              {moreOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
              {moreOpen ? 'Fewer options' : staff ? 'More options: title, semester, note' : 'Add a note for the office'}
            </button>
            {moreOpen && (
              <div className="space-y-4">
                {staff && (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="document-title" className="block text-[13px] font-bold text-slate-700">Title</label>
                      <input id="document-title" className="form-control form-control-md text-[14px]" value={title} maxLength={200} placeholder="Filled in from the file name" onChange={event => {
                        setTitle(event.target.value);
                        setTitleEdited(true);
                      }} />
                      <FieldError message={errors.title} />
                    </div>
                    <div className="space-y-1.5">
                      <span className="block text-[13px] font-bold text-slate-700">Semester</span>
                      <SelectMenu<string>
                        aria-label="Semester"
                        value={semester}
                        options={[...(options.semesters ?? []).map(item => ({ value: String(item.id), label: item.label })), { value: 'none', label: 'Not linked to a semester' }]}
                        onChange={setSemester}
                      />
                      <FieldError message={errors.semester} />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <label htmlFor="document-note" className="block text-[13px] font-bold text-slate-700">{staff ? 'Note' : 'Note for the office'}</label>
                  <textarea id="document-note" className="form-control min-h-24 px-3.5 py-3 text-[14px]" maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} placeholder="Anything people should know about this file" />
                  <FieldError message={errors.description} />
                </div>
              </div>
            )}
          </Section>

          <div className="flex flex-wrap justify-end gap-3 px-5 py-4 sm:px-6">
            <PortalButton type="button" onClick={onBack} disabled={submitting}>Cancel</PortalButton>
            <PortalButton type="submit" variant="primary" icon={Upload} isLoading={submitting}>Upload</PortalButton>
          </div>
        </form>
      )}
      <PortalConfirmModal
        isOpen={duplicate !== null}
        title="Upload this file again?"
        message={<div className="space-y-2">{(duplicate ?? []).map(line => <p key={line}>{line}</p>)}<p>Upload it anyway?</p></div>}
        confirmLabel="Upload anyway"
        cancelLabel="Cancel"
        isLoading={submitting}
        onConfirm={() => {
          setDuplicate(null);
          void submit(true);
        }}
        onCancel={() => setDuplicate(null)}
      />
    </RecordPage>
  );
};
