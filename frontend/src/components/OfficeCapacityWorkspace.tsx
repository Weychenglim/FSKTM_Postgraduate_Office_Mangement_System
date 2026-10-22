import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, History, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { cloneSemesterCapacityPlan, createSemesterCapacityPlan, discardSemesterCapacityPlan, getLecturerAvailabilityWindows, getLecturerCapacityAudits, getSemesterCapacityPlans, publishSemesterCapacityPlan, updateLecturerCapacityEntry } from '../services/lecturerCapacityApi';
import { getAcademicSemesters as readSemesters } from '../services/academicSemestersApi';
import { getCapacityWorkspace, type CapacityWorkspace, type CapacityWorkspaceLecturer } from '../services/capacityWorkspaceApi';
import type { AcademicSemester, CapacityRole, LecturerAvailabilityWindow, LecturerCapacityAudit, SemesterCapacityPlan } from '../types';
import { calendarDateInTimeZone, canMutateSemesterCapacity, capacityConflictMessage, capacityStateLabel, validateCapacityDraftEntry } from '../utils/lecturerCapacity';
import { capacityPlanningBaseline, capacityRowIssues, capacityWorkspaceRows, capacityComparisonRows, capacityHasRole } from '../utils/capacityWorkspace';
import { findEligiblePriorCapacitySource, publishedOperationalPolicy, readCompleteCapacityHistory } from './officeCapacityManagement';
import { PageHeader, PortalButton, PortalCard, PortalToast, StatusBadge } from './PortalPrimitives';
import { PortalSelect } from './PortalSelect';
import { OfficeToolSection } from './OfficeToolPrimitives';
import { CoordinatorDataTable } from './CoordinatorBrowsePrimitives';
import { WorkspacePagination, WorkspaceFilterCard } from './RequestWorkspacePrimitives';
import { EmptyState, ErrorState, LoadingState } from './StateViews';
import { CapacityPreparationForm } from './CapacityPreparationForm';
import { CapacityLecturerDialog } from './CapacityLecturerDialog';
import { DecisionDialog } from './DecisionDialog';
import { completeDecision } from '../utils/decisionSubmission';
import { RightDrawer } from './RightDrawer';
import { useReturnToFocusReload } from '../utils/returnToFocus';

type View = 'overview' | 'editor' | 'version' | 'history' | 'availability';
type Drawer = 'prepare' | 'entry' | 'details' | 'compare' | 'publish' | null;
const date = (value: string | null | undefined) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set';
const stamp = (value: string) => new Date(value).toLocaleString('en-MY');
const display = (value: number | null | undefined) => value == null ? 'Unavailable' : value;

export function OfficeCapacityWorkspace({ onBack, backLabel = 'Back to Dashboard' }: { onBack: () => void; backLabel?: string }) {
  const [semesters, setSemesters] = useState<AcademicSemester[]>([]), [semesterId, setSemesterId] = useState<number | null>(null);
  const [plans, setPlans] = useState<SemesterCapacityPlan[]>([]), [workspace, setWorkspace] = useState<CapacityWorkspace | null>(null);
  const [windows, setWindows] = useState<LecturerAvailabilityWindow[]>([]), [audits, setAudits] = useState<LecturerCapacityAudit[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null), [view, setView] = useState<View>('overview');
  const [drawer, setDrawer] = useState<Drawer>(null), [entry, setEntry] = useState<CapacityWorkspaceLecturer | null>(null);
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('lecturer') ?? '');
  const [role, setRole] = useState<'ALL' | CapacityRole>('ALL'), [needsSetup, setNeedsSetup] = useState(false);
  const [page, setPage] = useState(1), [size, setSize] = useState(10), [historyPage, setHistoryPage] = useState(1), [auditPage, setAuditPage] = useState(1), [windowPage, setWindowPage] = useState(1);
  const [supervisorLimit, setSupervisorLimit] = useState(''), [panelLimit, setPanelLimit] = useState('');
  const [publishReason, setPublishReason] = useState(''), [publishConfirmed, setPublishConfirmed] = useState(false);
  const [copySource, setCopySource] = useState<SemesterCapacityPlan | null>(null), [copyLoading, setCopyLoading] = useState(false), [comparePlanId, setComparePlanId] = useState<number | null>(null);
  const [discardPlan, setDiscardPlan] = useState<SemesterCapacityPlan | null>(null), [discardReason, setDiscardReason] = useState('');
  const [historyStatus, setHistoryStatus] = useState('ALL');
  const [loading, setLoading] = useState(true), [ready, setReady] = useState(false), [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null), [drawerError, setDrawerError] = useState<string | null>(null), [toast, setToast] = useState<string | null>(null);
  const generation = useRef(0), copyGeneration = useRef(0), writing = useRef(false);
  const semester = semesters.find(row => row.id === semesterId) ?? null;
  const published = publishedOperationalPolicy(plans), selected = plans.find(row => row.id === selectedPlanId) ?? null;
  const editing = view === 'editor' && selected?.lifecycleStatus === 'DRAFT';
  const inspecting = view === 'editor' || view === 'version';
  const mutable = !!semester && canMutateSemesterCapacity(semester.lifecycleStatus);
  const drafts = plans.filter(row => row.lifecycleStatus === 'DRAFT');
  const historyPlans = plans.filter(plan => historyStatus === 'ALL' || plan.lifecycleStatus === historyStatus);
  const activeWindows = windows.filter(row => !row.isCancelled && row.endsOn >= calendarDateInTimeZone());
  const rows = useMemo(() => capacityWorkspaceRows(workspace?.lecturers ?? [], inspecting ? selected : null), [workspace, selected, inspecting]);
  const visible = useMemo(() => rows.filter(row => (!search.trim() || `${row.lecturerName} ${row.staffNo}`.toLowerCase().includes(search.trim().toLowerCase())) && (role === 'ALL' || capacityHasRole(row,role,inspecting)) && (!needsSetup || capacityRowIssues(row, selected).length > 0)), [rows, search, role, needsSetup, selected, inspecting]);
  const pages = Math.max(1, Math.ceil(visible.length / size)), shown = visible.slice((Math.min(page, pages) - 1) * size, Math.min(page, pages) * size);
  const notify = (message: string) => setToast(message);
  const load = useCallback(async (id: number) => {
    const token = ++generation.current; setLoading(true); setReady(false); setError(null);
    try {
      const [nextPlans, nextRoster, nextWindows, nextAudits] = await Promise.all([
        readCompleteCapacityHistory(query => getSemesterCapacityPlans(id, query)), getCapacityWorkspace(id),
        readCompleteCapacityHistory(query => getLecturerAvailabilityWindows(id, query)), readCompleteCapacityHistory(query => getLecturerCapacityAudits(id, query)),
      ]);
      if (token !== generation.current) return;
      setPlans(nextPlans); setWorkspace(nextRoster); setWindows(nextWindows); setAudits(nextAudits); setReady(true); return true;
    } catch (reason) { if (token === generation.current) setError(capacityConflictMessage(reason)); return false; }
    finally { if (token === generation.current) setLoading(false); }
  }, []);
  const loadSemesters = useCallback(async () => {
    setLoading(true); setError(null);
    try {
const next = await readSemesters(true); setSemesters(next); const requested = new URLSearchParams(window.location.search).get('semester');
      if (requested && !next.some(row => String(row.id) === requested)) { setError('The requested semester is unavailable. Choose an available semester.'); setLoading(false); return; }
      setSemesterId(current => current ?? (requested ? Number(requested) : next.find(row => row.lifecycleStatus === 'ACTIVE')?.id ?? next.find(row => row.lifecycleStatus === 'DRAFT')?.id ?? next[0]?.id ?? null));
      if (!next.length) setLoading(false);
    } catch (reason) { setError(capacityConflictMessage(reason)); setLoading(false); }
  }, []);
  useEffect(() => { void loadSemesters(); }, [loadSemesters]);
  useEffect(() => { if (semesterId !== null) void load(semesterId); return () => { generation.current++; copyGeneration.current++; }; }, [load, semesterId]);
  useReturnToFocusReload(() => { if (semesterId !== null) void load(semesterId); }, !loading && !saving && drawer === null && discardPlan === null);
  useEffect(() => { setPage(1); }, [search, role, needsSetup, view, semesterId]);
  const close = () => { copyGeneration.current++; setDrawer(null); setDrawerError(null); setEntry(null); setPublishReason(''); setPublishConfirmed(false); };
  const openPlan = (plan: SemesterCapacityPlan, nextView: View) => { setSelectedPlanId(plan.id); setView(nextView); setNeedsSetup(false); setPage(1); close(); };
  const create = async (source: SemesterCapacityPlan | null = null) => {
    if (!ready || !mutable || semesterId === null || writing.current) return; writing.current = true; setSaving(true); setDrawerError(null);
    try { const created = await createSemesterCapacityPlan(semesterId, source?.id ?? null); await load(semesterId); openPlan(created, 'editor'); notify(`Draft v${created.version} created. You are now editing it.`); }
    catch (reason) { setDrawerError(capacityConflictMessage(reason)); } finally { writing.current = false; setSaving(false); }
  };
  const revise = async (source: SemesterCapacityPlan) => {
    if (!ready || !mutable || writing.current) return; writing.current = true; setSaving(true); setDrawerError(null);
    try { const created = await cloneSemesterCapacityPlan(source.id); if (semesterId !== null) await load(semesterId); openPlan(created, 'editor'); notify(`Draft v${created.version} created from version ${source.version}.`); }
    catch (reason) { setDrawerError(capacityConflictMessage(reason)); } finally { writing.current = false; setSaving(false); }
  };
  const openPreparation = () => { copyGeneration.current++; setCopySource(null); setCopyLoading(false); setDrawerError(null); setDrawer('prepare'); };
  const beginCopy = async () => {
    if (!semester) return; const token = ++copyGeneration.current; setCopyLoading(true); setCopySource(null); setDrawerError(null);
    try { const source = await findEligiblePriorCapacitySource(semesters, semester, id => readCompleteCapacityHistory(query => getSemesterCapacityPlans(id, query))); if (token === copyGeneration.current) setCopySource(source); }
    catch (reason) { if (token === copyGeneration.current) setDrawerError(capacityConflictMessage(reason)); }
    finally { if (token === copyGeneration.current) setCopyLoading(false); }
  };
  const editEntry = (row: CapacityWorkspaceLecturer) => { setEntry(row); setSupervisorLimit(row.supervisorLimit === null ? '' : String(row.supervisorLimit)); setPanelLimit(row.panelLimit === null ? '' : String(row.panelLimit)); setDrawerError(null); setDrawer('entry'); };
  const saveEntry = async () => {
    if (!ready || !editing || !mutable || !selected || !entry || entry.canConfigure === false || writing.current) return;
    const nextSupervisor = entry.supervisor && supervisorLimit.trim() ? Number(supervisorLimit) : null, nextPanel = entry.panel && panelLimit.trim() ? Number(panelLimit) : null;
    const issues = validateCapacityDraftEntry({ hasSupervisorRole: !!entry.supervisor, hasPanelRole: !!entry.panel, supervisorLimit: nextSupervisor, panelLimit: nextPanel });
    if ((nextSupervisor !== null && !Number.isSafeInteger(nextSupervisor)) || (nextPanel !== null && !Number.isSafeInteger(nextPanel))) issues.push('Limits must be whole numbers.');
    if (issues.length) { setDrawerError(issues.join(' ')); return; }
    writing.current = true; setSaving(true); setDrawerError(null);
    try { const updated = await updateLecturerCapacityEntry(selected.id, entry.lecturerId, { supervisorLimit: nextSupervisor, panelLimit: nextPanel, expectedVersion: selected.version, expectedFingerprint: selected.contentFingerprint }); setPlans(current => current.map(plan => plan.id === updated.id ? updated : plan)); close(); notify('Lecturer capacity limits saved.'); }
    catch (reason) { setDrawerError(capacityConflictMessage(reason)); if (semesterId !== null) await load(semesterId); }
    finally { writing.current = false; setSaving(false); }
  };
  const publish = async () => {
    if (!ready || !editing || !mutable || !selected || !publishReason.trim() || !publishConfirmed || writing.current) return; writing.current = true; setSaving(true); setDrawerError(null);
    try { const updated = await publishSemesterCapacityPlan(selected.id, { reason: publishReason.trim(), expectedVersion: selected.version, expectedFingerprint: selected.contentFingerprint }); if (semesterId !== null) await load(semesterId); close(); setView('overview'); notify(`Version ${updated.version} published. These limits are now in force.`); }
    catch (reason) { setDrawerError(capacityConflictMessage(reason)); if (semesterId !== null) await load(semesterId); }
    finally { writing.current = false; setSaving(false); }
  };
  const openCompare = () => { setComparePlanId(plans.find(plan => plan.id !== selected?.id)?.id ?? null); setDrawer('compare'); };
  const compare = plans.find(plan => plan.id === comparePlanId) ?? null;
  const roleValues = (row: CapacityWorkspaceLecturer, proposed = false) => <div className="space-y-2">{(['SUPERVISOR', 'PANEL'] as const).map(value => { const resolution = value === 'SUPERVISOR' ? row.supervisor : row.panel; const savedLimit = value === 'SUPERVISOR' ? row.supervisorLimit : row.panelLimit; if (!resolution && (!proposed || savedLimit === null)) return null; const limit = proposed ? savedLimit : resolution!.limit; return <p key={value}><span className="capacity-role-name">{value === 'SUPERVISOR' ? 'Supervisor' : 'Panel'}</span><strong className={limit === null ? 'text-amber-800' : 'text-brand-navy'}>{limit ?? 'Not set'}</strong>{proposed && <span className="capacity-current-value">Current: {resolution ? resolution.limit ?? 'Not set' : 'Role not held'}</span>}</p>; })}</div>;
  const availability = (row: CapacityWorkspaceLecturer) => { const restrictions = activeWindows.filter(item => item.lecturerId === row.lecturerId); return restrictions.length ? <div className="space-y-2">{restrictions.map(item => <p key={item.id}><strong className="block text-amber-800">{item.role === 'SUPERVISOR' ? 'Supervisor' : 'Panel'} · {item.isEffective ? 'Unavailable' : 'Scheduled'}</strong><span className="block text-slate-600">{date(item.startsOn)}–{date(item.endsOn)}</span></p>)}</div> : <span className="text-slate-700">No restriction</span>; };
  const paged = <T,>(items: T[], current: number) => items.slice((Math.min(current, Math.max(1, Math.ceil(items.length / size))) - 1) * size, Math.min(current, Math.max(1, Math.ceil(items.length / size))) * size);
  const footer = (total: number, current: number, onPage: (value: number) => void, noun: string) => <WorkspacePagination total={total} page={Math.min(current, Math.max(1, Math.ceil(total / size)))} pageCount={Math.max(1, Math.ceil(total / size))} pageSize={size} onPage={onPage} onPageSize={value => { setSize(value); setPage(1); setHistoryPage(1); setAuditPage(1); setWindowPage(1); }} noun={noun} />;
  return <div className="office-tool-page capacity-workspace space-y-6 pb-12">
    <PortalToast message={toast} onClose={() => setToast(null)} />
    <PageHeader title="Lecturer capacity" subtitle="Review student workload, plan limits and monitor lecturer availability." backLabel={view === 'overview' ? backLabel : 'Back to Lecturer capacity'} onBack={view === 'overview' ? onBack : () => { setView('overview'); setNeedsSetup(false); }} />
    <div className="capacity-semester-selection" role="region" aria-label="Semester context">
      <div className="capacity-semester-control">
        <label htmlFor="capacity-academic-semester" className="capacity-field-label">Academic semester</label>
        <PortalSelect id="capacity-academic-semester" aria-describedby={semester ? 'capacity-semester-dates' : undefined} className="form-control form-control-md" value={semesterId ?? ''} disabled={saving || drawer !== null || discardPlan !== null} onChange={event => { setReady(false); setSemesterId(Number(event.target.value)); setView('overview'); setSelectedPlanId(null); setHistoryPage(1); setAuditPage(1); setWindowPage(1); }}><option value="" disabled>Select semester</option>{semesters.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</PortalSelect>
        {semester && <p id="capacity-semester-dates" className="capacity-semester-dates">{date(semester.startsOn)}–{date(semester.endsOn)}</p>}
      </div>
      {semester && <div className="capacity-semester-status"><StatusBadge tone={semester.lifecycleStatus === 'ACTIVE' ? 'success' : semester.lifecycleStatus === 'DRAFT' ? 'warning' : 'neutral'}>{semester.lifecycleStatus}</StatusBadge></div>}
    </div>
    {loading ? <LoadingState message="Loading Lecturer capacity…" /> : error ? <ErrorState message={error} onRetry={() => semesterId === null ? void loadSemesters() : void load(semesterId)} /> : !semester ? <EmptyState title="No academic semesters" description="Create a semester before preparing capacity limits." /> : workspace && <>
      {view === 'overview' ? <PortalCard padding="none" className="capacity-policy-card" role="region" aria-label="Semester capacity policy">
        <section className="capacity-policy-summary" aria-label="Published capacity policy">
          <div className="capacity-policy-heading">
            <div><h2 className="section-heading">Current limits</h2><p className="capacity-policy-version">{published ? `Version ${published.version} is currently in force` : 'No published limits for this semester'}</p></div>
            <PortalButton size="sm" icon={History} onClick={() => setView('history')}>Versions and history</PortalButton>
          </div>
          <div className="capacity-policy-actions">{drafts[0] && mutable && <PortalButton size="sm" variant="primary" disabled={!ready || saving} onClick={() => openPlan(drafts[0], 'editor')}>Continue draft v{drafts[0].version}</PortalButton>}<PortalButton size="sm" variant={drafts[0] && mutable ? 'secondary' : 'primary'} icon={Plus} disabled={!ready || !mutable || saving} onClick={openPreparation}>Prepare limits</PortalButton></div>
        </section>
        <div className="capacity-baseline"><div><h2 className="section-label">Planning baseline</h2><p className="mt-1 text-sm text-slate-700"><strong className="text-lg text-brand-navy tabular-nums">{capacityPlanningBaseline(workspace.baseline)}</strong>{workspace.baseline.studentsPerLecturer !== null ? ' students per lecturer' : ''}</p></div><div className="text-sm text-slate-600"><p>{workspace.baseline.activeStudents} active students ÷ {workspace.baseline.eligibleLecturers} eligible lecturers</p><p className="mt-1">Across all faculties/programmes recorded in this portal. Guidance only; Supervisor and Panel limits are set separately.</p></div></div>
        <p className="capacity-workload-note">Workload includes ongoing appointments across semesters. Limits belong to the selected semester.</p>
        {published && published.readinessErrors.length > 0 && <details className="capacity-policy-issues"><summary>Current policy needs attention · {published.readinessErrors.length} issues<span className="capacity-issues-hint">View details</span></summary><div className="capacity-policy-issue-details"><p>Some required lecturer limits are missing or no longer match their roles. Prepare a draft to review them.</p><ul className="list-disc pl-5 mt-3 space-y-2">{published.readinessErrors.map(message => <li key={message}>{message}</li>)}</ul></div></details>}
      </PortalCard> : inspecting && selected && <div className="flex flex-wrap justify-end gap-2"><PortalButton size="sm" icon={Eye} disabled={plans.length < 2} onClick={openCompare}>Compare versions</PortalButton>{!editing && ['PUBLISHED', 'SUPERSEDED'].includes(selected.lifecycleStatus) && mutable && <PortalButton size="sm" onClick={openPreparation}>Prepare a revision</PortalButton>}</div>}
      {inspecting && selected && <OfficeToolSection title={editing ? `Editing draft v${selected.version}` : `Viewing version ${selected.version}`} description={editing ? 'Saved changes stay in this draft until it is published. Workload and current limits are live reference values.' : 'Read-only inspection. Published limits remain in force regardless of which version you view.'} actions={<StatusBadge tone={selected.lifecycleStatus === 'PUBLISHED' ? 'success' : selected.lifecycleStatus === 'DRAFT' ? 'warning' : 'neutral'}>{selected.lifecycleStatus}</StatusBadge>}>
        <div className="p-5 space-y-4">
          {editing && selected.readinessErrors.length > 0 ? <div className="capacity-readiness"><h3 className="font-semibold">{selected.readinessErrors.length} {selected.readinessErrors.length === 1 ? 'issue prevents' : 'issues prevent'} publication</h3><p className="mt-1">Review the highlighted rows in the table below.</p><details className="mt-3"><summary>View all issue details</summary><p className="mt-3">Complete missing limits before publishing. If a saved row is no longer eligible or holds different roles, prepare a fresh draft from current published limits or start blank. The original draft and its history are retained.</p><ul className="list-disc pl-5 mt-3 space-y-2">{selected.readinessErrors.map(message => <li key={message}>{message}</li>)}</ul></details>{rows.some(row => row.canConfigure === false && capacityRowIssues(row, selected).length > 0) && <div className="mt-4"><PortalButton size="sm" disabled={!ready || !mutable || saving} onClick={openPreparation}>Prepare a fresh draft</PortalButton></div>}</div> : editing ? <p className="font-semibold text-emerald-800">All required limits are configured. Review the draft before publishing.</p> : <p className="text-sm text-slate-700">Created by {selected.createdBy.name} · {stamp(selected.createdAt)}{selected.publicationReason ? ` · ${selected.publicationReason}` : ''}</p>}
          {editing && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">Zero is a valid limit and blocks new assignments for that role.</p><PortalButton size="sm" variant="primary" icon={ShieldCheck} disabled={!ready || !mutable || !selected.isComplete || selected.readinessErrors.length > 0} onClick={() => { setDrawerError(null); setDrawer('publish'); }}>Review and publish</PortalButton></div>}
          {view === 'version' && selected.lifecycleStatus === 'DRAFT' && mutable && <PortalButton size="sm" onClick={() => setView('editor')}>Continue editing this draft</PortalButton>}
        </div></OfficeToolSection>}
      {(view === 'overview' || inspecting) && <OfficeToolSection title={editing ? 'Proposed lecturer limits' : view === 'version' ? 'Version limits' : 'Lecturer workload'} description={editing ? 'Edit each lecturer’s limits. Missing values are shown as Not set.' : 'Active student totals count distinct students. Pending Panel recommendations reserve capacity but are not active students.'}>
        <div className="p-4 sm:p-5"><WorkspaceFilterCard fieldsClassName={editing ? 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3' : 'grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]'} onReset={() => { setSearch(''); setRole('ALL'); setNeedsSetup(false); setPage(1); }}><label className="form-label">Find a lecturer<input type="search" className="form-control form-control-sm mt-1" placeholder="Name or staff number" value={search} onChange={event => setSearch(event.target.value)} /></label><label className="form-label">Role<PortalSelect id="capacity-roster-role" className="form-control form-control-sm mt-1" value={role} onChange={event => setRole(event.target.value as typeof role)}><option value="ALL">All roles</option><option value="SUPERVISOR">Supervisor</option><option value="PANEL">Panel</option></PortalSelect></label>{editing && <label className="form-label">Show<PortalSelect id="capacity-roster-show" className="form-control form-control-sm mt-1" value={needsSetup ? 'issues' : 'all'} onChange={event => setNeedsSetup(event.target.value === 'issues')}><option value="all">All lecturers</option><option value="issues">Lecturers needing attention</option></PortalSelect></label>}</WorkspaceFilterCard></div>
        <div className="capacity-table p-4 sm:p-5">{editing && <p role="status" className="capacity-result-summary">Showing {shown.length} of {visible.length} {visible.length === 1 ? 'lecturer' : 'lecturers'}{needsSetup ? ' needing attention' : ''}{search.trim() || role !== 'ALL' ? ' matching your filters' : ''}</p>}{!visible.length ? <EmptyState title="No matching lecturers" description="Adjust the search or filters." /> : <CoordinatorDataTable label="Lecturer capacity roster" columns={['Lecturer', 'Active students', editing ? 'Proposed limits' : inspecting ? 'Version limits' : 'Published limits', 'Availability', 'Action']} rows={shown.map(row => ({
key: row.lecturerId, cells: [
            <div><p className="font-semibold text-brand-navy">{row.lecturerName}</p><p className="text-slate-600 mt-1">{row.staffNo}</p>{row.userEnabled === false && <p className="text-slate-600 mt-1">Account disabled</p>}{row.participantLifecycle !== 'ACTIVE' && <StatusBadge tone="neutral">{row.participantLifecycle}</StatusBadge>}{editing && capacityRowIssues(row, selected).map(message => <p className="capacity-row-issue" key={message}>{message}</p>)}</div>,
            <div className="space-y-1"><strong className="text-base text-brand-navy tabular-nums">{display(row.activeStudentCount)}</strong><p>Supervisor: {display(row.primaryStudentCount == null || row.supportingStudentCount == null ? null : row.primaryStudentCount + row.supportingStudentCount)}</p><p>Panel: {display(row.panelStudentCount)}</p>{row.workloadIdentityIncomplete && <p className="text-amber-800">Student links need review</p>}{!!row.panel?.reservedLoad && <p className="text-slate-600">+ {row.panel.reservedLoad} pending Panel</p>}</div>, roleValues(row, inspecting), availability(row),
            editing ? <PortalButton size="sm" disabled={!ready || !mutable || row.participantLifecycle !== 'ACTIVE' || row.canConfigure === false || saving} onClick={() => editEntry(row)}>Edit limits</PortalButton> : <PortalButton size="sm" onClick={() => { setEntry(row); setDrawer('details'); }}>View</PortalButton>,
          ]
}))} />}<div className="mt-4">{footer(visible.length, Math.min(page, pages), setPage, 'lecturers')}</div></div>
      </OfficeToolSection>}
      {view === 'history' && <>
        <OfficeToolSection className="capacity-versions-section" title="Capacity versions" description="Continue a draft or inspect a recorded version. Discarded drafts stay in history and cannot be edited.">
          <div className="capacity-version-filter"><label htmlFor="capacity-history-status" className="capacity-field-label">Version status</label><PortalSelect id="capacity-history-status" className="form-control form-control-sm" value={historyStatus} onChange={event => { setHistoryStatus(event.target.value); setHistoryPage(1); }}><option value="ALL">All versions</option><option value="DRAFT">Drafts</option><option value="PUBLISHED">Published</option><option value="SUPERSEDED">Superseded</option><option value="DISCARDED">Discarded</option></PortalSelect></div>
          <div className="capacity-versions-table p-4 sm:p-5">{historyPlans.length ? <CoordinatorDataTable label="Capacity versions" columns={['Version', 'Status', 'Created by', 'Created on', 'Action']} rows={paged(historyPlans, historyPage).map(plan => ({ key: plan.id, cells: [
            <div><strong>Version {plan.version}</strong>{plan.lifecycleStatus === 'DRAFT' && <p className="mt-1 text-slate-600">{plan.readinessErrors.length ? `${plan.readinessErrors.length} issues remaining` : 'Ready for review'}</p>}{plan.publicationReason && <p className="mt-1 text-slate-600">{plan.publicationReason}</p>}</div>,
            <StatusBadge tone={plan.lifecycleStatus === 'PUBLISHED' ? 'success' : plan.lifecycleStatus === 'DRAFT' ? 'warning' : 'neutral'}>{plan.lifecycleStatus}</StatusBadge>, plan.createdBy.name, stamp(plan.createdAt),
            <div className="capacity-version-actions"><PortalButton size="sm" disabled={saving} onClick={() => openPlan(plan, plan.lifecycleStatus === 'DRAFT' && mutable ? 'editor' : 'version')}>{plan.lifecycleStatus === 'DRAFT' && mutable ? 'Edit draft' : 'View version'}</PortalButton>{plan.lifecycleStatus === 'DRAFT' && mutable && <PortalButton size="sm" variant="danger" icon={Trash2} aria-label={`Discard draft version ${plan.version}`} disabled={!ready || saving} onClick={() => { setDiscardReason(''); setDiscardPlan(plan); }}>Discard</PortalButton>}</div>,
          ] }))} /> : <EmptyState title="No matching capacity versions" description="Choose another status to see recorded versions." />}{footer(historyPlans.length, historyPage, setHistoryPage, 'versions')}</div>
        </OfficeToolSection>
        <OfficeToolSection title="Audit history" description="Recorded changes are retained for review."><div className="p-5 space-y-4">{paged(audits, auditPage).map(audit => <div className="capacity-history-row" key={audit.id}><div><p className="font-semibold">{audit.action.replaceAll('_', ' ')}</p><p className="text-slate-600 mt-1">{audit.actor.name} · {stamp(audit.createdAt)}</p>{audit.reason && <p className="mt-2">{audit.reason}</p>}</div></div>)}{!audits.length && <EmptyState title="No capacity audit events" />}{footer(audits.length, auditPage, setAuditPage, 'audit events')}</div></OfficeToolSection>
      </>}
      {(view === 'history' || view === 'availability') && <OfficeToolSection title="Availability history" description="Lecturers manage their own availability. Office can review restrictions and their recorded reasons."><div className="p-5 space-y-4">{paged(windows, windowPage).map(item => <div className="capacity-history-row" key={item.id}><div><p className="font-semibold">{item.lecturerName} · {item.role === 'SUPERVISOR' ? 'Supervisor' : 'Panel'}</p><p className="mt-1 text-slate-600">{date(item.startsOn)}–{date(item.endsOn)}</p><p className="mt-2">{item.reason}</p></div><StatusBadge tone={item.isCancelled ? 'neutral' : item.isEffective ? 'warning' : 'info'}>{item.isCancelled ? 'Cancelled' : item.isEffective ? 'Effective' : item.endsOn < calendarDateInTimeZone() ? 'Ended' : 'Scheduled'}</StatusBadge></div>)}{!windows.length && <EmptyState title="No availability restrictions" />}{footer(windows.length, windowPage, setWindowPage, 'restrictions')}</div></OfficeToolSection>}
    </>}
    <RightDrawer isOpen={drawer === 'prepare' || drawer === 'compare' || drawer === 'publish'} onClose={close} title={drawer === 'prepare' ? 'Prepare capacity limits' : drawer === 'compare' ? 'Compare versions' : 'Review and publish'} backLabel="Back to lecturer capacity" pageKey="capacity-workspace-record" busy={saving} dirty={drawer === 'publish' && (!!publishReason.trim() || publishConfirmed)}>
      {drawerError && <div role="alert" className="capacity-readiness mb-5">{drawerError}</div>}
      {drawer === 'prepare' && <CapacityPreparationForm drafts={drafts} published={published} previous={copySource} checkingPrevious={copyLoading} disabled={!ready || !mutable || saving} busy={saving} onCheckPrevious={() => void beginCopy()} onContinue={plan => openPlan(plan, 'editor')} onCurrent={() => { if (published) void revise(published); }} onCreate={source => void create(source)} />}
      {drawer === 'compare' && selected && <div className="space-y-5"><label className="form-label block">Compare version {selected.version} with<PortalSelect className="form-control form-control-md mt-1" value={comparePlanId ?? ''} onChange={event => setComparePlanId(Number(event.target.value))}>{plans.filter(plan => plan.id !== selected.id).map(plan => <option key={plan.id} value={plan.id}>Version {plan.version} · {plan.lifecycleStatus}</option>)}</PortalSelect></label>{compare ? <CoordinatorDataTable label="Capacity version comparison" columns={['Lecturer', `Version ${selected.version}`, `Version ${compare.version}`]} rows={capacityComparisonRows(workspace?.lecturers ?? [], selected, compare).map(row => { const other = compare.entries.find(item => item.lecturerId === row.lecturerId); return { key: row.lecturerId, cells: [row.lecturerName, <p>Supervisor: {row.supervisorLimit ?? 'Not set'}<br />Panel: {row.panelLimit ?? 'Not set'}</p>, <p>Supervisor: {other?.supervisorLimit ?? 'Not set'}<br />Panel: {other?.panelLimit ?? 'Not set'}</p>] }; })} /> : <EmptyState title="No comparison version" />}</div>}
      {drawer === 'publish' && selected && <div className="space-y-5"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><strong>Draft v{selected.version}</strong><p className="mt-2">Publishing makes these limits authoritative and this version read-only.{published ? ` It replaces published version ${published.version}.` : ''} Existing appointments remain active.</p></div><label className="form-label block">Publication reason<textarea className="form-control form-control-md mt-1 min-h-28" value={publishReason} onChange={event => setPublishReason(event.target.value)} /></label><label className="flex items-start gap-3 text-sm text-slate-700"><input className="mt-1" type="checkbox" checked={publishConfirmed} onChange={event => setPublishConfirmed(event.target.checked)} /><span>I confirm the Supervisor and Panel limits have been reviewed.</span></label><PortalButton fullWidth variant="primary" icon={ShieldCheck} disabled={!ready || !editing || !mutable || saving || !selected.isComplete || selected.readinessErrors.length > 0 || !publishReason.trim() || !publishConfirmed} isLoading={saving} onClick={() => void publish()}>Publish limits</PortalButton></div>}
    </RightDrawer>
    {(drawer === 'entry' || drawer === 'details') && entry && <CapacityLecturerDialog title={drawer === 'entry' ? 'Edit lecturer limits' : 'Lecturer details'} lecturerName={entry.lecturerName} staffNo={entry.staffNo} busy={saving}
      dirty={drawer === 'entry' && (supervisorLimit !== String(entry.supervisorLimit ?? '') || panelLimit !== String(entry.panelLimit ?? ''))} onClose={close}
      footer={requestClose => <><PortalButton disabled={saving} onClick={requestClose}>{drawer === 'entry' ? 'Cancel' : 'Close'}</PortalButton>{drawer === 'entry' && <PortalButton type="submit" form="capacity-entry-form" variant="primary" icon={Save} disabled={!ready || !editing || !mutable || entry.canConfigure === false || saving} isLoading={saving}>Save limits</PortalButton>}</>}>
      {drawerError && <div role="alert" className="capacity-readiness">{drawerError}</div>}
      {drawer === 'entry' ? <form id="capacity-entry-form" className="space-y-5" onSubmit={event => { event.preventDefault(); void saveEntry(); }}>
        <p>Editing draft v{selected?.version}. These changes do not affect published limits until publication.</p>
        {!editing && <p role="alert" className="capacity-readiness">This version is now read-only. Your unsaved values are retained; review the latest version before continuing.</p>}
        <fieldset disabled={saving || !editing || !mutable || entry.canConfigure === false} className="grid gap-5 sm:grid-cols-2">
          {entry.supervisor && <label className="block capacity-field-label">Supervisor limit<input className="form-control form-control-md mt-2" type="number" autoFocus min="0" step="1" value={supervisorLimit} onChange={event => setSupervisorLimit(event.target.value)} /><span className="mt-2 block text-xs font-normal text-slate-600">Current published limit: {entry.supervisor.limit ?? 'Not set'}</span></label>}
          {entry.panel && <label className="block capacity-field-label">Panel limit<input className="form-control form-control-md mt-2" type="number" autoFocus={!entry.supervisor} min="0" step="1" value={panelLimit} onChange={event => setPanelLimit(event.target.value)} /><span className="mt-2 block text-xs font-normal text-slate-600">Current published limit: {entry.panel.limit ?? 'Not set'}</span></label>}
        </fieldset>
        <p className="text-slate-600">Use a whole number. Zero blocks new assignments for that role.</p>
      </form> : <div className="space-y-6 text-sm text-slate-700"><dl className="capacity-detail-counts"><div><dt>Total active students</dt><dd>{display(entry.activeStudentCount)}</dd></div><div><dt>Primary supervision</dt><dd>{display(entry.primaryStudentCount)}</dd></div><div><dt>Supporting supervision</dt><dd>{display(entry.supportingStudentCount)}</dd></div><div><dt>Active Panel students</dt><dd>{display(entry.panelStudentCount)}</dd></div><div><dt>Pending Panel recommendations</dt><dd>{entry.panel?.reservedLoad ?? 0}</dd></div></dl>{entry.workloadIdentityIncomplete && <p className="text-amber-800">Some active Panel records have no linked student. Unique student totals are unavailable until those records are linked.</p>}<section><h3 className="section-label mb-3">Published limits</h3><div className="grid gap-3 sm:grid-cols-2">{(['SUPERVISOR', 'PANEL'] as const).map(value => { const resolution = value === 'SUPERVISOR' ? entry.supervisor : entry.panel; return resolution ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={value}><p className="font-semibold text-brand-navy">{value === 'SUPERVISOR' ? 'Supervisor' : 'Panel'}</p><p className="mt-1">Limit: <strong>{resolution.limit ?? 'Not set'}</strong></p><p className="mt-1">{capacityStateLabel(resolution.state)}</p><p>{resolution.availableSlots ?? 'Unavailable'} remaining places</p></div> : null; })}</div></section>{inspecting && <section><h3 className="section-label mb-3">Version {selected?.version} limits</h3>{roleValues(entry, true)}</section>}<section><h3 className="section-label mb-2">Availability</h3><p className="mb-3">Lecturers manage their own availability. Existing appointments remain active.</p>{availability(entry)}<button className="capacity-text-link mt-4 block" onClick={() => { close(); setView('availability'); window.scrollTo({ top: 0, behavior: 'instant' }); }}>View availability history</button></section></div>}
    </CapacityLecturerDialog>}
    <DecisionDialog isOpen={discardPlan !== null} decisionKey={discardPlan?.id} title="Discard capacity draft?" kind="confirmation" tone="danger" context={discardPlan ? `${discardPlan.semesterLabel} · Version ${discardPlan.version}` : undefined} message="This removes the draft from active work. Its limits and audit history are retained, but the draft cannot be edited or published. Published limits stay unchanged." confirmLabel="Discard draft" successMessage={`Draft v${discardPlan?.version} discarded.`} busy={saving} dirty={!!discardReason.trim()} canConfirm={ready && mutable && !!discardReason.trim()} onClose={() => { setDiscardPlan(null); setDiscardReason(''); }} onReload={async () => { if (semesterId === null || !await load(semesterId)) throw new Error('Could not reload capacity versions. Try again.'); }} onConfirm={async () => {
      if (!ready || !mutable || !discardPlan || !discardReason.trim() || writing.current) return false;
      const target = discardPlan;
      writing.current = true; setSaving(true);
      try {
        return await completeDecision(async () => {
          const updated = await discardSemesterCapacityPlan(target.id, {reason: discardReason.trim(), expectedVersion: target.version, expectedFingerprint: target.contentFingerprint, confirmed: true});
          setPlans(current => current.map(plan => plan.id === updated.id ? updated : plan));
        }, async () => { if (semesterId === null || !await load(semesterId)) throw new Error('Could not reload capacity versions.'); });
      } finally { writing.current = false; setSaving(false); }
    }}><label className="form-label block">Reason for discarding<textarea className="form-control form-control-md mt-1 min-h-24" value={discardReason} onChange={event => setDiscardReason(event.target.value)} /></label></DecisionDialog>
  </div>;
}
