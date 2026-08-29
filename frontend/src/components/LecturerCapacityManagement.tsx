import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarOff,
  CheckCircle2,
  Copy,
  Eye,
  History,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';

import {
  cancelLecturerAvailabilityWindow,
  cloneSemesterCapacityPlan,
  createLecturerAvailabilityWindow,
  createSemesterCapacityPlan,
  getAcademicSemesters,
  getLecturerAvailabilityWindows,
  getLecturerCapacityAudits,
  getSemesterCapacityPlans,
  publishSemesterCapacityPlan,
  updateLecturerCapacityEntry,
} from '../services';
import type {
  AcademicSemester,
  CapacityRole,
  CapacityState,
  LecturerAvailabilityWindow,
  LecturerCapacityAudit,
  LecturerCapacityEntry,
  SemesterCapacityPlan,
} from '../types';
import {
  calendarDateInTimeZone,
  canMutateSemesterCapacity,
  capacityConflictMessage,
  capacityStateLabel,
  capacityUtilization,
  validateAvailabilityWindow,
  validateCapacityDraftEntry,
} from '../utils/lecturerCapacity';
import {
  PageHeader,
  PortalButton,
  PortalToast,
  ProgressBar,
  StatusBadge,
  type BadgeTone,
} from './PortalPrimitives';
import { RightDrawer } from './RightDrawer';
import { EmptyState, ErrorState, LoadingState } from './StateViews';

interface LecturerCapacityManagementProps {
  onBack: () => void;
}

type DrawerMode = 'entry' | 'availability' | 'publish' | 'cancel' | 'compare' | null;

const stateTone = (state: CapacityState): BadgeTone => {
  if (state === 'AVAILABLE') return 'success';
  if (state === 'FULL' || state === 'TEMPORARILY_UNAVAILABLE') return 'warning';
  if (state === 'OVER_CAPACITY' || state === 'NOT_CONFIGURED') return 'danger';
  return 'neutral';
};

const lifecycleTone = (status: SemesterCapacityPlan['lifecycleStatus']): BadgeTone => {
  if (status === 'PUBLISHED') return 'success';
  if (status === 'DRAFT') return 'warning';
  if (status === 'SUPERSEDED') return 'neutral';
  return 'neutral';
};

const displayDate = (value: string | null | undefined): string => {
  if (!value) return 'Not set';
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const displayTimestamp = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-MY');
};

const roleLoad = (entry: LecturerCapacityEntry, role: CapacityRole): number => {
  const resolution = role === 'SUPERVISOR' ? entry.supervisor : entry.panel;
  return resolution ? resolution.activeLoad + resolution.reservedLoad : 0;
};

export function LecturerCapacityManagement({ onBack }: LecturerCapacityManagementProps) {
  const [semesters, setSemesters] = useState<AcademicSemester[]>([]);
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [plans, setPlans] = useState<SemesterCapacityPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [windows, setWindows] = useState<LecturerAvailabilityWindow[]>([]);
  const [audits, setAudits] = useState<LecturerCapacityAudit[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | CapacityRole>('ALL');
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedEntry, setSelectedEntry] = useState<LecturerCapacityEntry | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<LecturerAvailabilityWindow | null>(null);
  const [supervisorLimit, setSupervisorLimit] = useState('');
  const [panelLimit, setPanelLimit] = useState('');
  const [availabilityRole, setAvailabilityRole] = useState<CapacityRole>('SUPERVISOR');
  const [availabilityLecturerId, setAvailabilityLecturerId] = useState('');
  const [availabilityStartsOn, setAvailabilityStartsOn] = useState('');
  const [availabilityEndsOn, setAvailabilityEndsOn] = useState('');
  const [availabilityReason, setAvailabilityReason] = useState('');
  const [publishReason, setPublishReason] = useState('');
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [comparePlanId, setComparePlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selectedSemester = semesters.find((semester) => semester.id === semesterId) ?? null;
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;
  const comparePlan = plans.find((plan) => plan.id === comparePlanId) ?? null;
  const semesterAllowsChanges = selectedSemester
    ? canMutateSemesterCapacity(selectedSemester.lifecycleStatus)
    : false;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  };

  const loadSemesterData = useCallback(async (targetSemesterId: number) => {
    setLoading(true);
    setError(null);
    try {
      const [planRows, windowRows, auditRows] = await Promise.all([
        getSemesterCapacityPlans(targetSemesterId, { limit: 100 }),
        getLecturerAvailabilityWindows(targetSemesterId, { limit: 100 }),
        getLecturerCapacityAudits(targetSemesterId, { limit: 100 }),
      ]);
      setPlans(planRows);
      setWindows(windowRows);
      setAudits(auditRows);
      setSelectedPlanId((current) => (
        planRows.some((plan) => plan.id === current) ? current : planRows[0]?.id ?? null
      ));
    } catch (loadError) {
      setError(capacityConflictMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSemesters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getAcademicSemesters(true);
      setSemesters(rows);
      const preferred = rows.find((semester) => semester.lifecycleStatus === 'ACTIVE')
        ?? rows.find((semester) => semester.lifecycleStatus === 'DRAFT')
        ?? rows[0]
        ?? null;
      setSemesterId((current) => (
        rows.some((semester) => semester.id === current) ? current : preferred?.id ?? null
      ));
      if (rows.length === 0) setLoading(false);
    } catch (loadError) {
      setError(capacityConflictMessage(loadError));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSemesters();
  }, [loadSemesters]);

  useEffect(() => {
    if (semesterId !== null) void loadSemesterData(semesterId);
  }, [loadSemesterData, semesterId]);

  const reloadAfterConflict = async (message: string) => {
    setDrawerError(message);
    if (semesterId !== null) await loadSemesterData(semesterId);
  };

  const closeDrawer = () => {
    setDrawerMode(null);
    setSelectedEntry(null);
    setSelectedWindow(null);
    setDrawerError(null);
    setPublishReason('');
    setPublishConfirmed(false);
    setCancelReason('');
    setCancelConfirmed(false);
  };

  const visibleEntries = useMemo(() => {
    if (!selectedPlan) return [];
    const query = search.trim().toLowerCase();
    return selectedPlan.entries.filter((entry) => {
      const matchesSearch = !query
        || entry.lecturerName.toLowerCase().includes(query)
        || entry.staffNo.toLowerCase().includes(query);
      const matchesRole = roleFilter === 'ALL'
        || (roleFilter === 'SUPERVISOR' ? entry.supervisor !== null : entry.panel !== null);
      return matchesSearch && matchesRole;
    });
  }, [roleFilter, search, selectedPlan]);

  const activeWindows = useMemo(
    () => {
      const today = calendarDateInTimeZone();
      return windows.filter((window) => !window.isCancelled && window.endsOn >= today);
    },
    [windows],
  );

  const windowFor = (entry: LecturerCapacityEntry, role: CapacityRole) => (
    activeWindows.find((window) => (
      window.lecturerId === entry.lecturerId && window.role === role
    )) ?? null
  );

  const beginEntryEdit = (entry: LecturerCapacityEntry) => {
    setSelectedEntry(entry);
    setSupervisorLimit(entry.supervisorLimit === null ? '' : String(entry.supervisorLimit));
    setPanelLimit(entry.panelLimit === null ? '' : String(entry.panelLimit));
    setDrawerError(null);
    setDrawerMode('entry');
  };

  const saveEntry = async () => {
    if (!selectedPlan || !selectedEntry) return;
    const nextSupervisor = selectedEntry.supervisor === null || !supervisorLimit.trim()
      ? null
      : Number(supervisorLimit);
    const nextPanel = selectedEntry.panel === null || !panelLimit.trim()
      ? null
      : Number(panelLimit);
    const validation = validateCapacityDraftEntry({
      hasSupervisorRole: selectedEntry.supervisor !== null,
      hasPanelRole: selectedEntry.panel !== null,
      supervisorLimit: Number.isFinite(nextSupervisor) ? nextSupervisor : null,
      panelLimit: Number.isFinite(nextPanel) ? nextPanel : null,
    });
    if (validation.length > 0) {
      setDrawerError(validation.join(' '));
      return;
    }
    setSaving(true);
    setDrawerError(null);
    try {
      const updated = await updateLecturerCapacityEntry(
        selectedPlan.id,
        selectedEntry.lecturerId,
        {
          supervisorLimit: nextSupervisor,
          panelLimit: nextPanel,
          expectedVersion: selectedPlan.version,
          expectedFingerprint: selectedPlan.contentFingerprint,
        },
      );
      setPlans((current) => current.map((plan) => (plan.id === updated.id ? updated : plan)));
      showToast('Lecturer capacity limits saved.');
      closeDrawer();
    } catch (saveError) {
      await reloadAfterConflict(capacityConflictMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const createPlan = async () => {
    if (semesterId === null) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createSemesterCapacityPlan(semesterId);
      await loadSemesterData(semesterId);
      setSelectedPlanId(created.id);
      showToast('Blank Draft capacity plan created.');
    } catch (createError) {
      setError(capacityConflictMessage(createError));
    } finally {
      setSaving(false);
    }
  };

  const clonePlan = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    setError(null);
    try {
      const cloned = await cloneSemesterCapacityPlan(selectedPlan.id);
      if (semesterId !== null) await loadSemesterData(semesterId);
      setSelectedPlanId(cloned.id);
      showToast(`Capacity plan v${selectedPlan.version} cloned to Draft v${cloned.version}.`);
    } catch (cloneError) {
      setError(capacityConflictMessage(cloneError));
    } finally {
      setSaving(false);
    }
  };

  const publishPlan = async () => {
    if (!selectedPlan || !publishReason.trim() || !publishConfirmed) return;
    setSaving(true);
    setDrawerError(null);
    try {
      const published = await publishSemesterCapacityPlan(selectedPlan.id, {
        reason: publishReason.trim(),
        expectedVersion: selectedPlan.version,
        expectedFingerprint: selectedPlan.contentFingerprint,
      });
      if (semesterId !== null) await loadSemesterData(semesterId);
      setSelectedPlanId(published.id);
      showToast(`Capacity plan v${published.version} published.`);
      closeDrawer();
    } catch (publishError) {
      await reloadAfterConflict(capacityConflictMessage(publishError));
    } finally {
      setSaving(false);
    }
  };

  const availableLecturers = useMemo(() => (
    selectedPlan?.entries.filter((entry) => (
      availabilityRole === 'SUPERVISOR' ? entry.supervisor !== null : entry.panel !== null
    )) ?? []
  ), [availabilityRole, selectedPlan]);

  const beginAvailability = () => {
    const first = selectedPlan?.entries.find((entry) => entry.supervisor !== null);
    setAvailabilityRole('SUPERVISOR');
    setAvailabilityLecturerId(first ? String(first.lecturerId) : '');
    setAvailabilityStartsOn(selectedSemester?.startsOn ?? '');
    setAvailabilityEndsOn(selectedSemester?.startsOn ?? '');
    setAvailabilityReason('');
    setDrawerError(null);
    setDrawerMode('availability');
  };

  const saveAvailability = async () => {
    if (!selectedSemester || !availabilityLecturerId || !availabilityReason.trim()) return;
    const dateError = validateAvailabilityWindow(
      availabilityStartsOn,
      availabilityEndsOn,
      selectedSemester,
    );
    if (dateError) {
      setDrawerError(dateError);
      return;
    }
    setSaving(true);
    setDrawerError(null);
    try {
      await createLecturerAvailabilityWindow(selectedSemester.id, {
        lecturerId: Number(availabilityLecturerId),
        role: availabilityRole,
        startsOn: availabilityStartsOn,
        endsOn: availabilityEndsOn,
        reason: availabilityReason.trim(),
      });
      await loadSemesterData(selectedSemester.id);
      showToast('Availability restriction recorded.');
      closeDrawer();
    } catch (availabilityError) {
      await reloadAfterConflict(capacityConflictMessage(availabilityError));
    } finally {
      setSaving(false);
    }
  };

  const beginCancelWindow = (window: LecturerAvailabilityWindow) => {
    setSelectedWindow(window);
    setCancelReason('');
    setCancelConfirmed(false);
    setDrawerError(null);
    setDrawerMode('cancel');
  };

  const cancelWindow = async () => {
    if (!selectedWindow || !cancelReason.trim() || !cancelConfirmed) return;
    setSaving(true);
    setDrawerError(null);
    try {
      await cancelLecturerAvailabilityWindow(selectedWindow.id, cancelReason.trim());
      if (semesterId !== null) await loadSemesterData(semesterId);
      showToast('Availability restriction cancelled.');
      closeDrawer();
    } catch (cancelError) {
      await reloadAfterConflict(capacityConflictMessage(cancelError));
    } finally {
      setSaving(false);
    }
  };

  const openCompare = () => {
    const candidate = plans.find((plan) => plan.id !== selectedPlan?.id) ?? null;
    setComparePlanId(candidate?.id ?? null);
    setDrawerMode('compare');
  };

  const drawerTitle = drawerMode === 'entry'
    ? `Edit capacity: ${selectedEntry?.lecturerName ?? ''}`
    : drawerMode === 'availability'
      ? 'Record Lecturer availability'
      : drawerMode === 'publish'
        ? 'Publish capacity plan'
        : drawerMode === 'cancel'
          ? 'Cancel availability restriction'
          : 'Compare capacity plan versions';

  return (
    <div className="space-y-6 pb-16 text-left text-xs">
      <PortalToast message={toast} />
      <PageHeader
        title="Lecturer Capacity Management"
        subtitle="Configure versioned Supervisor and Panel limits and temporary availability by academic semester."
        actions={(
          <>
            <PortalButton variant="secondary" icon={ArrowLeft} onClick={onBack}>Back</PortalButton>
            <PortalButton icon={RefreshCw} onClick={() => semesterId && void loadSemesterData(semesterId)}>Refresh</PortalButton>
          </>
        )}
      />

      <section className="border-y border-slate-200 py-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,420px)_1fr] lg:items-end">
          <label>
            <span className="form-label mb-2 block">Academic semester</span>
            <select className="form-input w-full" value={semesterId ?? ''} onChange={(event) => setSemesterId(Number(event.target.value))}>
              {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.label} - {semester.lifecycleStatus}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <PortalButton icon={Plus} onClick={() => void createPlan()} disabled={!semesterAllowsChanges || saving}>New Draft</PortalButton>
            <PortalButton icon={Copy} onClick={() => void clonePlan()} disabled={!semesterAllowsChanges || !selectedPlan || selectedPlan.lifecycleStatus === 'DRAFT' || saving}>Clone Version</PortalButton>
            <PortalButton icon={Eye} onClick={openCompare} disabled={plans.length < 2}>Compare</PortalButton>
            <PortalButton icon={CalendarOff} onClick={beginAvailability} disabled={!semesterAllowsChanges || !selectedPlan}>Add Availability</PortalButton>
          </div>
        </div>
      </section>

      {error && <ErrorState message={error} onRetry={() => semesterId && void loadSemesterData(semesterId)} />}
      {loading && <LoadingState message="Loading Lecturer capacity policy..." />}
      {!loading && !error && semesters.length === 0 && <EmptyState title="No academic semesters" description="Create a semester before configuring Lecturer capacity." />}

      {!loading && !error && selectedSemester && (
        <>
          <section className="grid gap-3 md:grid-cols-4" aria-label="Capacity policy summary">
            <div className="border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase text-slate-400">Selected semester</p><p className="mt-2 font-black text-brand-navy">{selectedSemester.label}</p><p className="mt-1 text-slate-500">{displayDate(selectedSemester.startsOn)} to {displayDate(selectedSemester.endsOn)}</p></div>
            <div className="border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase text-slate-400">Policy versions</p><p className="mt-2 text-2xl font-black text-brand-navy">{plans.length}</p></div>
            <div className="border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase text-slate-400">Current policy</p><p className="mt-2 text-2xl font-black text-brand-navy">{selectedPlan ? `v${selectedPlan.version}` : 'None'}</p></div>
            <div className="border border-slate-200 bg-white p-4"><p className="text-[10px] font-black uppercase text-slate-400">Active restrictions</p><p className="mt-2 text-2xl font-black text-brand-navy">{activeWindows.length}</p></div>
          </section>

          {plans.length === 0 ? (
            <EmptyState
              title="No capacity plan"
              description={semesterAllowsChanges
                ? 'Create a Draft plan, set every required role limit, then publish it before semester activation.'
                : 'This semester is read-only and has no capacity plan.'}
              actionLabel={semesterAllowsChanges ? 'Create Draft plan' : undefined}
              onAction={semesterAllowsChanges ? () => void createPlan() : undefined}
            />
          ) : (
            <>
              <section className="border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                  <div><h2 className="text-sm font-black text-brand-navy">Plan history</h2><p className="mt-1 text-slate-500">Published versions remain immutable; edit only the selected Draft.</p></div>
                  <div className="flex flex-wrap gap-2">
                    {plans.map((plan) => <button key={plan.id} type="button" onClick={() => setSelectedPlanId(plan.id)} className={`border px-3 py-2 font-black ${selectedPlan?.id === plan.id ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-200 bg-white text-slate-600'}`}>v{plan.version} {plan.lifecycleStatus}</button>)}
                  </div>
                </div>
                {selectedPlan && (
                  <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge tone={lifecycleTone(selectedPlan.lifecycleStatus)}>{selectedPlan.lifecycleStatus}</StatusBadge>
                      <StatusBadge tone={selectedPlan.isComplete ? 'success' : 'danger'}>{selectedPlan.isComplete ? 'Ready' : 'Incomplete'}</StatusBadge>
                      <span className="text-slate-500">Origin: {selectedPlan.origin.replaceAll('_', ' ')}</span>
                      <span className="text-slate-500">Supersedes: {selectedPlan.supersedesId ?? 'None'}</span>
                    </div>
                    {selectedPlan.lifecycleStatus === 'DRAFT' && <PortalButton variant="primary" icon={ShieldCheck} disabled={!semesterAllowsChanges || !selectedPlan.isComplete || selectedPlan.readinessErrors.length > 0} onClick={() => setDrawerMode('publish')}>Publish Plan</PortalButton>}
                  </div>
                )}
                {selectedPlan && selectedPlan.readinessErrors.length > 0 && <div className="border-t border-rose-100 bg-rose-50 px-4 py-3 text-rose-700"><p className="font-black">Publication blockers</p><ul className="mt-2 list-disc space-y-1 pl-5">{selectedPlan.readinessErrors.map((message) => <li key={message}>{message}</li>)}</ul></div>}
              </section>

              <section className="overflow-hidden border border-slate-200 bg-white">
                <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_200px]">
                  <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="form-input w-full pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Lecturer or staff number" /></label>
                  <select className="form-input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'ALL' | CapacityRole)}><option value="ALL">All roles</option><option value="SUPERVISOR">Supervisor</option><option value="PANEL">Panel</option></select>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table min-w-[1120px]">
                    <thead><tr className="data-thead"><th className="data-th text-left">Lecturer</th><th className="data-th text-left">Lifecycle</th><th className="data-th text-left">Supervisor load / limit</th><th className="data-th text-left">Panel confirmed + reserved / limit</th><th className="data-th text-left">Current or upcoming availability</th><th className="data-th text-right">Action</th></tr></thead>
                    <tbody>
                      {visibleEntries.map((entry) => {
                        const supervisorWindow = windowFor(entry, 'SUPERVISOR');
                        const panelWindow = windowFor(entry, 'PANEL');
                        return (
                          <tr key={entry.id} className="data-row">
                            <td className="data-td"><p className="font-black text-brand-navy">{entry.lecturerName}</p><p className="mt-1 text-slate-500">{entry.staffNo}</p></td>
                            <td className="data-td"><StatusBadge tone={entry.participantLifecycle === 'ACTIVE' ? 'success' : 'neutral'}>{entry.participantLifecycle}</StatusBadge></td>
                            <td className="data-td min-w-[220px]">{entry.supervisor ? <div className="space-y-2"><div className="flex items-center justify-between gap-3"><span className="font-black">{roleLoad(entry, 'SUPERVISOR')} / {entry.supervisor.limit ?? 0}</span><StatusBadge tone={stateTone(entry.supervisor.state)}>{capacityStateLabel(entry.supervisor.state)}</StatusBadge></div><ProgressBar value={capacityUtilization(roleLoad(entry, 'SUPERVISOR'), entry.supervisor.limit ?? 0)} /></div> : <span className="text-slate-400">Not a Supervisor</span>}</td>
                            <td className="data-td min-w-[250px]">{entry.panel ? <div className="space-y-2"><div className="flex items-center justify-between gap-3"><span className="font-black">{entry.panel.activeLoad} + {entry.panel.reservedLoad} / {entry.panel.limit ?? 0}</span><StatusBadge tone={stateTone(entry.panel.state)}>{capacityStateLabel(entry.panel.state)}</StatusBadge></div><ProgressBar value={capacityUtilization(roleLoad(entry, 'PANEL'), entry.panel.limit ?? 0)} /></div> : <span className="text-slate-400">Not a Panel Lecturer</span>}</td>
                            <td className="data-td min-w-[230px]">{[supervisorWindow, panelWindow].filter(Boolean).length > 0 ? <div className="space-y-2">{[supervisorWindow, panelWindow].filter(Boolean).map((window) => window && <button key={window.id} type="button" className="block text-left font-bold text-amber-700 hover:underline" onClick={() => beginCancelWindow(window)}>{window.role}: {displayDate(window.startsOn)} to {displayDate(window.endsOn)}</button>)}</div> : <span className="text-slate-400">No active restriction</span>}</td>
                            <td className="data-td text-right"><PortalButton size="sm" icon={SlidersHorizontal} disabled={!semesterAllowsChanges || selectedPlan.lifecycleStatus !== 'DRAFT'} onClick={() => beginEntryEdit(entry)}>Edit</PortalButton></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {visibleEntries.length === 0 && <EmptyState title="No matching Lecturers" description="Adjust the search or role filter." />}
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 p-4"><h2 className="flex items-center gap-2 text-sm font-black text-brand-navy"><CalendarOff className="h-4 w-4" /> Availability history</h2></div>
                  {windows.length === 0 ? <EmptyState title="No availability restrictions" /> : <div className="divide-y divide-slate-100">{windows.map((window) => <div key={window.id} className="flex items-start justify-between gap-3 p-4"><div><p className="font-black text-brand-navy">{window.lecturerName} - {window.role}</p><p className="mt-1 text-slate-500">{displayDate(window.startsOn)} to {displayDate(window.endsOn)}</p><p className="mt-1 text-slate-600">{window.reason}</p></div><StatusBadge tone={window.isCancelled ? 'neutral' : window.isEffective ? 'warning' : 'info'}>{window.isCancelled ? 'Cancelled' : window.isEffective ? 'Effective' : 'Scheduled'}</StatusBadge></div>)}</div>}
                </div>
                <div className="border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 p-4"><h2 className="flex items-center gap-2 text-sm font-black text-brand-navy"><History className="h-4 w-4" /> Immutable audit history</h2></div>
                  {audits.length === 0 ? <EmptyState title="No capacity audit events" /> : <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">{audits.map((audit) => <div key={audit.id} className="p-4"><div className="flex items-start justify-between gap-3"><p className="font-black text-brand-navy">{audit.action.replaceAll('_', ' ')}</p><span className="text-slate-400">{displayTimestamp(audit.createdAt)}</span></div><p className="mt-1 text-slate-500">{audit.actor.name}</p>{audit.reason && <p className="mt-2 text-slate-600">{audit.reason}</p>}</div>)}</div>}
                </div>
              </section>
            </>
          )}
        </>
      )}

      <RightDrawer isOpen={drawerMode !== null} onClose={closeDrawer} title={drawerTitle}>
        {drawerError && <ErrorState message={drawerError} />}
        {drawerMode === 'entry' && selectedEntry && <div className="space-y-5"><p className="text-sm text-slate-600">Set independent role limits. Zero is valid and blocks new assignment activation.</p>{selectedEntry.supervisor && <label><span className="form-label mb-2 block">Supervisor limit</span><input className="form-input w-full" type="number" min="0" value={supervisorLimit} onChange={(event) => setSupervisorLimit(event.target.value)} /></label>}{selectedEntry.panel && <label><span className="form-label mb-2 block">Panel limit</span><input className="form-input w-full" type="number" min="0" value={panelLimit} onChange={(event) => setPanelLimit(event.target.value)} /></label>}<PortalButton fullWidth variant="primary" icon={Save} isLoading={saving} onClick={() => void saveEntry()}>Save Limits</PortalButton></div>}

        {drawerMode === 'availability' && selectedSemester && <div className="space-y-5"><label><span className="form-label mb-2 block">Role</span><select className="form-input w-full" value={availabilityRole} onChange={(event) => { const role = event.target.value as CapacityRole; setAvailabilityRole(role); const first = selectedPlan?.entries.find((entry) => role === 'SUPERVISOR' ? entry.supervisor : entry.panel); setAvailabilityLecturerId(first ? String(first.lecturerId) : ''); }}><option value="SUPERVISOR">Supervisor</option><option value="PANEL">Panel</option></select></label><label><span className="form-label mb-2 block">Lecturer</span><select className="form-input w-full" value={availabilityLecturerId} onChange={(event) => setAvailabilityLecturerId(event.target.value)}><option value="">Select Lecturer</option>{availableLecturers.map((entry) => <option key={entry.lecturerId} value={entry.lecturerId}>{entry.lecturerName} ({entry.staffNo})</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label><span className="form-label mb-2 block">Starts on</span><input className="form-input w-full" type="date" value={availabilityStartsOn} onChange={(event) => setAvailabilityStartsOn(event.target.value)} /></label><label><span className="form-label mb-2 block">Ends on</span><input className="form-input w-full" type="date" value={availabilityEndsOn} onChange={(event) => setAvailabilityEndsOn(event.target.value)} /></label></div><label><span className="form-label mb-2 block">Reason</span><textarea className="form-input min-h-28 w-full" value={availabilityReason} onChange={(event) => setAvailabilityReason(event.target.value)} /></label><PortalButton fullWidth variant="primary" icon={CalendarOff} isLoading={saving} disabled={!availabilityLecturerId || !availabilityReason.trim()} onClick={() => void saveAvailability()}>Record Availability</PortalButton></div>}

        {drawerMode === 'publish' && selectedPlan && <div className="space-y-5"><div className="border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><p className="flex items-center gap-2 font-black"><CheckCircle2 className="h-4 w-4" /> Plan v{selectedPlan.version} is ready</p><p className="mt-2">Publishing makes this version authoritative and immutable.</p></div><label><span className="form-label mb-2 block">Publication reason</span><textarea className="form-input min-h-28 w-full" value={publishReason} onChange={(event) => setPublishReason(event.target.value)} /></label><label className="flex items-start gap-3 border border-slate-200 p-4"><input type="checkbox" checked={publishConfirmed} onChange={(event) => setPublishConfirmed(event.target.checked)} /><span className="font-bold text-slate-600">I confirm these Supervisor and Panel limits have been reviewed.</span></label><PortalButton fullWidth variant="primary" icon={ShieldCheck} isLoading={saving} disabled={!publishReason.trim() || !publishConfirmed} onClick={() => void publishPlan()}>Publish Capacity Plan</PortalButton></div>}

        {drawerMode === 'cancel' && selectedWindow && <div className="space-y-5"><div className="border border-amber-200 bg-amber-50 p-4 text-amber-800"><p className="font-black">{selectedWindow.lecturerName} - {selectedWindow.role}</p><p className="mt-2">{displayDate(selectedWindow.startsOn)} to {displayDate(selectedWindow.endsOn)}</p></div><label><span className="form-label mb-2 block">Cancellation reason</span><textarea className="form-input min-h-28 w-full" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></label><label className="flex items-start gap-3 border border-slate-200 p-4"><input type="checkbox" checked={cancelConfirmed} onChange={(event) => setCancelConfirmed(event.target.checked)} /><span className="font-bold text-slate-600">I confirm this restriction should be cancelled. Its history remains visible.</span></label><PortalButton fullWidth variant="dangerSolid" icon={XCircle} isLoading={saving} disabled={!cancelReason.trim() || !cancelConfirmed} onClick={() => void cancelWindow()}>Cancel Restriction</PortalButton></div>}

        {drawerMode === 'compare' && selectedPlan && <div className="space-y-5"><label><span className="form-label mb-2 block">Compare selected v{selectedPlan.version} with</span><select className="form-input w-full" value={comparePlanId ?? ''} onChange={(event) => setComparePlanId(Number(event.target.value))}>{plans.filter((plan) => plan.id !== selectedPlan.id).map((plan) => <option key={plan.id} value={plan.id}>v{plan.version} {plan.lifecycleStatus}</option>)}</select></label>{comparePlan ? <div className="overflow-x-auto border border-slate-200"><table className="data-table min-w-[620px]"><thead><tr className="data-thead"><th className="data-th text-left">Lecturer</th><th className="data-th">v{selectedPlan.version} S/P</th><th className="data-th">v{comparePlan.version} S/P</th></tr></thead><tbody>{selectedPlan.entries.map((entry) => { const other = comparePlan.entries.find((candidate) => candidate.lecturerId === entry.lecturerId); return <tr key={entry.id} className="data-row"><td className="data-td font-black">{entry.lecturerName}</td><td className="data-td">{entry.supervisorLimit ?? '-'} / {entry.panelLimit ?? '-'}</td><td className="data-td">{other?.supervisorLimit ?? '-'} / {other?.panelLimit ?? '-'}</td></tr>; })}</tbody></table></div> : <EmptyState title="No comparison version" />}</div>}
      </RightDrawer>
    </div>
  );
}
