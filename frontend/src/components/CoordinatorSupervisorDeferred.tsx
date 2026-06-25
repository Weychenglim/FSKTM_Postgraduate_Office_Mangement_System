import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import {
  approveSupervisorApplicationByCoordinator,
  getCoordinatorSupervisorQueue,
  rejectSupervisorApplicationByCoordinator,
} from '../services';
import { SupervisorApplicationRecord } from '../types';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';
import { WorkflowAuditLog } from './WorkflowAuditLog';


interface CoordinatorSupervisorDeferredProps {
  initialApplicationId?: string;
}

export const CoordinatorSupervisorDeferred: React.FC<CoordinatorSupervisorDeferredProps> = ({
  initialApplicationId,
}) => {
  const [records, setRecords] = useState<SupervisorApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadRecords = useCallback(() => {
    setLoading(true);
    setError(null);
    getCoordinatorSupervisorQueue()
      .then(setRecords)
      .catch((reason) => setError(
        reason instanceof Error ? reason.message : 'Failed to load supervisor approvals.',
      ))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  const approve = async (record: SupervisorApplicationRecord) => {
    try {
      await approveSupervisorApplicationByCoordinator(record.id);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      notify(`Supervisor appointment approved for ${record.studentName}.`);
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Approval failed.');
    }
  };

  const reject = async (record: SupervisorApplicationRecord) => {
    const reason = window.prompt('Enter the reason for rejecting this supervisor appointment:');
    if (reason === null) return;
    if (!reason.trim()) {
      notify('A rejection reason is required.');
      return;
    }
    try {
      await rejectSupervisorApplicationByCoordinator(record.id, reason.trim());
      setRecords((current) => current.filter((item) => item.id !== record.id));
      notify(`Supervisor appointment returned for ${record.studentName}.`);
    } catch (failure) {
      notify(failure instanceof Error ? failure.message : 'Rejection failed.');
    }
  };

  return (
    <div id="coordinator-supervisor-approvals" className="space-y-8 animate-fade-in text-left">
      <PortalToast message={toast} />
      <PageHeader
        title="Supervisor Appointment Approvals"
        subtitle="Review supervisor requests accepted by lecturers in your managed programme."
      />

      {loading ? (
        <LoadingState message="Loading supervisor approvals…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadRecords} />
      ) : records.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-3" />
          <h2 className="font-black text-brand-navy">No pending supervisor approvals</h2>
          <p className="text-xs font-semibold text-slate-400 mt-2">
            Accepted lecturer requests will appear here for final confirmation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div
              key={record.id}
              className={`bg-white border rounded-2xl p-6 shadow-3xs ${
                String(record.id) === String(initialApplicationId)
                  ? 'border-blue-400 ring-2 ring-blue-100'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-black text-brand-navy">{record.studentName}</h2>
                    <StatusBadge tone="warning">Pending Coordinator</StatusBadge>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">
                    {record.studentId} · {record.programme}
                  </p>
                  <p className="text-xs font-bold text-slate-700">{record.researchTitle}</p>
                  <p className="text-[11px] text-slate-500">
                    Proposed supervisor: <strong>{record.proposedSupervisor}</strong>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <PortalButton
                    variant="secondary"
                    icon={XCircle}
                    onClick={() => reject(record)}
                  >
                    Reject
                  </PortalButton>
                  <PortalButton
                    variant="primary"
                    icon={Clock3}
                    onClick={() => approve(record)}
                  >
                    Approve
                  </PortalButton>
                </div>
              </div>
              <div className="mt-4">
                <WorkflowAuditLog events={record.workflow} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
