import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Send, XCircle } from 'lucide-react';
import {
  ApiError,
  approveSupervisorApplicationByCoordinator,
  formatSupervisorWaiting,
  getCoordinatorSupervisorRecords,
  getCoordinatorSupervisorQueue,
  orderSupervisorQueueOldestFirst,
  rejectSupervisorApplicationByCoordinator,
  endSupervisorAppointment,
} from '../services';
import { SupervisorApplicationRecord } from '../types';
import { PageHeader, PortalButton, PortalToast, StatusBadge } from './PortalPrimitives';
import { ErrorState, LoadingState } from './StateViews';
import { WorkflowAuditLog } from './WorkflowAuditLog';
import { SupervisorDocumentsList } from './SupervisorDocumentsList';
import { AppointmentEndControl } from './AppointmentEndControl';


interface CoordinatorSupervisorApprovalsProps {
  initialApplicationId?: string;
  onNavigateToDossier?: (studentId: string) => void;
}

export const CoordinatorSupervisorApprovals: React.FC<CoordinatorSupervisorApprovalsProps> = ({
  initialApplicationId,
  onNavigateToDossier,
}) => {
  const [records, setRecords] = useState<SupervisorApplicationRecord[]>([]);
  const [appointmentRecords, setAppointmentRecords] = useState<SupervisorApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rejectingRecordId, setRejectingRecordId] = useState<number | string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadRecords = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getCoordinatorSupervisorQueue(),
      getCoordinatorSupervisorRecords(),
    ])
      .then(([queue, history]) => {
        setRecords(orderSupervisorQueueOldestFirst(queue));
        setAppointmentRecords(history);
      })
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
      const approved = await approveSupervisorApplicationByCoordinator(record.id);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      if (String(rejectingRecordId) === String(record.id)) {
        setRejectingRecordId(null);
        setRejectionReason('');
      }
      notify(
        approved.researchProfileReady
          ? `Supervisor appointment approved for ${record.studentName}. The research profile is ready for Panel recommendation.`
          : `Supervisor appointment approved for ${record.studentName}.`,
      );
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Approval failed.');
      if (reason instanceof ApiError && reason.status === 409) loadRecords();
    }
  };

  const reject = async (record: SupervisorApplicationRecord) => {
    if (!rejectionReason.trim()) {
      notify('A rejection reason is required.');
      return;
    }
    try {
      await rejectSupervisorApplicationByCoordinator(record.id, rejectionReason.trim());
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setRejectingRecordId(null);
      setRejectionReason('');
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
          {records.map((record) => {
            const isRejecting = String(rejectingRecordId) === String(record.id);

            return (
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
                  <p className="text-[11px] font-semibold text-slate-500">
                    Research area: <strong>{record.researchArea || 'Not recorded'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Proposed supervisor: <strong>{record.proposedSupervisor}</strong>
                  </p>
                  {record.unavailableUntil && (
                    <p className="text-[11px] font-bold text-amber-700">
                      Unavailable for new appointments until {record.unavailableUntil}. This pending approval remains recorded.
                    </p>
                  )}
                  <p className="text-[11px] font-bold text-amber-700">
                    {formatSupervisorWaiting(record)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <PortalButton
                    variant="ghost"
                    onClick={() => onNavigateToDossier?.(record.studentId)}
                  >
                    View Dossier
                  </PortalButton>
                  <PortalButton
                    variant="secondary"
                    icon={XCircle}
                    disabled={record.participantEligible === false}
                    onClick={() => {
                      setRejectingRecordId(isRejecting ? null : record.id);
                      setRejectionReason('');
                    }}
                  >
                    {isRejecting ? 'Cancel' : 'Reject'}
                  </PortalButton>
                  <PortalButton
                    variant="primary"
                    icon={Clock3}
                    disabled={isRejecting || record.participantEligible === false}
                    onClick={() => approve(record)}
                  >
                    Approve
                  </PortalButton>
                </div>
              </div>
              {record.participantEligible === false && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-800">
                  This Student is {record.participantLifecycleStatus?.toLowerCase()}; the approval remains visible but is non-actionable until eligible.
                </p>
              )}
              {isRejecting && (
                <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/70 p-4">
                  <label
                    htmlFor={`coordinator-supervisor-rejection-${record.id}`}
                    className="text-[10px] font-black uppercase tracking-wider text-rose-700"
                  >
                    Rejection reason
                  </label>
                  <textarea
                    id={`coordinator-supervisor-rejection-${record.id}`}
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    placeholder="Explain why this supervisor appointment is being returned."
                  />
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <PortalButton
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRejectingRecordId(null);
                        setRejectionReason('');
                      }}
                    >
                      Cancel
                    </PortalButton>
                    <PortalButton
                      variant="dangerSolid"
                      size="sm"
                      icon={Send}
                      onClick={() => reject(record)}
                    >
                      Submit Rejection
                    </PortalButton>
                  </div>
                </div>
              )}
              <div className="mt-4">
                <SupervisorDocumentsList
                  applicationId={record.id}
                  documents={record.documents}
                  compact
                />
              </div>
              <div className="mt-4">
                <WorkflowAuditLog events={record.workflow} />
              </div>
            </div>
            );
          })}
        </div>
      )}

      {!loading && !error && (
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-black text-brand-navy uppercase tracking-wider">Programme Appointment Records</h2>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              Active and ended Supervisor appointments in your managed programme.
            </p>
          </div>
          {appointmentRecords.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-xs font-semibold text-slate-400">
              No approved Supervisor appointments are recorded for this programme.
            </div>
          ) : (
            <div className="space-y-3">
              {appointmentRecords.map((record) => (
                <div key={`appointment-${record.id}`} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-black text-brand-navy">{record.studentName}</p>
                      <StatusBadge tone={record.appointmentLifecycle?.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {record.appointmentLifecycle?.status === 'ACTIVE' ? 'Active' : record.appointmentLifecycle?.endOutcome || 'Ended'}
                      </StatusBadge>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">
                      {record.studentId} · {record.proposedSupervisor}
                    </p>
                    {record.appointmentLifecycle?.endReason && (
                      <p className="text-[11px] text-slate-500 mt-2">{record.appointmentLifecycle.endReason}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <PortalButton variant="ghost" onClick={() => onNavigateToDossier?.(record.studentId)}>
                      View Dossier
                    </PortalButton>
                    {record.appointmentLifecycle?.status === 'ACTIVE' && (
                      <AppointmentEndControl
                        label="Supervisor appointment"
                        onSubmit={async (outcome, reason) => {
                          await endSupervisorAppointment(record.appointmentLifecycle!.appointmentId, outcome, reason);
                          await loadRecords();
                          notify(`Supervisor appointment ended for ${record.studentName}.`);
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
