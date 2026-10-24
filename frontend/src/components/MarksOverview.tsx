import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CalendarRange, CircleAlert, ClipboardList, FileCheck2, SlidersHorizontal } from 'lucide-react';
import { APP_ROUTES } from '../constants/routes';
import { getEvaluationPeriods, getRubricVersions } from '../services/marksApi';
import { getDashboardSummary } from '../services/timelineApi';
import type { DashboardSummary, EvaluationPeriodOption, RubricVersion } from '../types';
import { buildMarksSetupChecklist, formatPeriodStatus } from '../utils/marksProductionManagement';
import type { MarkRecordStatusTab } from '../utils/markRecords';
import { AlertListCard } from './AlertListCard';
import { ChecklistCard } from './ChecklistCard';
import { MarkSubmissionMonitoring } from './MarkSubmissionMonitoring';
import { MarksHeading, MarksSummaryCard } from './MarksPrimitives';
import { PageHeader } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';

const date = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function MarksOverview({ onViewRecords }: { onViewRecords: (status?: MarkRecordStatusTab) => void }) {
  const navigate = useNavigate();
  const [data, setData] = useState<{ summary: DashboardSummary; periods: EvaluationPeriodOption[]; rubrics: RubricVersion[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    Promise.all([getDashboardSummary(), getEvaluationPeriods(), getRubricVersions()])
      .then(([summary, periods, rubrics]) => { if (!cancelled) setData({ summary, periods, rubrics }); })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Marks overview could not be loaded.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  const period = data?.periods.find(row => row.effectiveStatus === 'OPEN') || data?.periods.find(row => row.effectiveStatus === 'SCHEDULED') || data?.periods[0];
  const rubric = data?.rubrics.find(row => row.id === period?.rubricId) || data?.rubrics.find(row => row.isActive);
  const totals = period?.taskTotals;
  const total = totals?.total ?? ((data?.summary.submittedMarkEntries ?? 0) + (data?.summary.incompleteMarkEntries ?? 0));
  const submitted = totals?.submitted ?? data?.summary.submittedMarkEntries ?? 0;
  const pending = totals?.incomplete ?? data?.summary.incompleteMarkEntries ?? 0;

  return <div id="marks-entry-workspace" className="marks-workspace space-y-6">
    <PageHeader title="Marks & Evaluation Management" subtitle="Prepare evaluations and track mark submissions." />
    {loading ? <LoadingState message="Loading marks overview…" /> : error ? <ErrorState title="Marks overview could not be loaded" message={error} onRetry={() => setAttempt(value => value + 1)} /> : null}
    {!loading && !error && data ? <>
      <section aria-label="Evaluation summary" className="space-y-3">
        {period ? <p className="card-description"><span className="block font-semibold text-brand-navy">Summary for one period</span><span className="mt-1 block">{period.name} · {period.semester}</span></p> : null}
        <div id="summary-cards-grid" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <MarksSummaryCard state title="Mark entry period" icon={CalendarRange} value={period ? formatPeriodStatus(period.effectiveStatus) : 'Not configured'}
            description={period ? [date(period.opensAt), date(period.closesAt)].filter(Boolean).join(' – ') || 'Dates not configured' : undefined} />
          <MarksSummaryCard state title="Rubric components" icon={SlidersHorizontal} value={rubric?.isReady ? 'Ready' : rubric ? 'Needs work' : 'Not configured'}
            description={rubric ? `${rubric.id === period?.rubricId ? 'Period rubric' : 'Active rubric'}: ${rubric.components.filter(component => component.isActive ?? component.status === 'ACTIVE').length} components · ${rubric.componentTotal} / ${rubric.targetMark} marks` : undefined} />
          <MarksSummaryCard title="Evaluation tasks" icon={ClipboardList} value={total}
            description={total > 0 ? `${totals?.supervisor ?? data.summary.supervisorMarkTasks ?? 0} supervisor, ${totals?.panel ?? data.summary.panelMarkTasks ?? 0} panel, ${totals?.backup ?? data.summary.backupMarkTasks ?? 0} backup` : undefined} />
          <MarksSummaryCard title="Submitted marks" icon={FileCheck2} value={total > 0 ? `${submitted} / ${total}` : '—'} description={total > 0 ? `${pending} submissions pending` : undefined} />
        </div>
      </section>
    </> : null}
    <div id="core-layout-grid" className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <ChecklistCard unavailable={loading || !!error} items={buildMarksSetupChecklist(data?.periods ?? [], data?.rubrics ?? [])} onItemAction={item => navigate(item.id === 'period' ? APP_ROUTES.marksConfig : item.id === 'rubric' ? APP_ROUTES.marksRubrics : APP_ROUTES.marksTasks)} />
      {!loading && !error && data ? <AlertListCard periods={data.periods} rubrics={data.rubrics} onViewRecords={onViewRecords} onManageRubrics={() => navigate(APP_ROUTES.marksRubrics)} /> : <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><MarksHeading icon={CircleAlert}>Evaluation checks</MarksHeading><p className="card-description mt-2">{loading ? 'Loading evaluation checks…' : 'Evaluation checks could not be loaded. Setup pages and submission monitoring remain available.'}</p></aside>}
    </div>
    <MarkSubmissionMonitoring onViewRecords={onViewRecords} />
  </div>;
}
