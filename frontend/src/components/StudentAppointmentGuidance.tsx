import React, { useEffect, useState } from 'react';
import { getActiveSupervisorDocumentRequirements } from '../services/appointmentsApi';
import type { SupervisorDocumentRequirement } from '../types';
import { formatSupervisorDocumentSize, SUPERVISOR_DOCUMENT_MAX_FILES, SUPERVISOR_DOCUMENT_MAX_TOTAL_BYTES } from '../utils/supervisorDocuments';
import { PortalButton } from './PortalPrimitives';
import { StudentAppointmentGuidance, type AppointmentGuidanceCard } from './StudentAppointmentPrimitives';

type GuidanceProps = { hasSupervisor: boolean; onShowFAQChatbot?: () => void };

export function SupervisorAppointmentGuidanceView({ requirements, loading, error, onRetry, hasSupervisor, onShowFAQChatbot }: GuidanceProps & {
  requirements: SupervisorDocumentRequirement[]; loading: boolean; error: string | null; onRetry: () => void;
}) {
  const active = requirements.filter(row => row.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  const cards: AppointmentGuidanceCard[] = [{ title: 'Documents for a new application', content: loading ? <p role="status">Loading document requirements…</p> : error ? <><p role="alert">{error}</p><PortalButton size="sm" onClick={onRetry}>Retry requirements</PortalButton></> : active.length ? <>
    <ul className="space-y-1">{active.map(row => <li key={row.id}>{row.label} <span className="card-label">({row.isRequired ? 'Required' : 'Optional'})</span></li>)}</ul>
    <p>PDF or DOCX. Up to {SUPERVISOR_DOCUMENT_MAX_FILES} files, {formatSupervisorDocumentSize(SUPERVISOR_DOCUMENT_MAX_TOTAL_BYTES)} combined.</p>
  </> : <p>Document requirements are not configured. Contact the Postgraduate Office before applying.</p> }];
  if (hasSupervisor) cards.push({ title: 'Changing your supervisor', content: <p>Provide a replacement reason and fresh supporting documents. Your current supervisor remains assigned until the replacement is approved.</p> });
  return <StudentAppointmentGuidance cards={cards} onShowFAQChatbot={onShowFAQChatbot} />;
}

export function SupervisorAppointmentGuidance(props: GuidanceProps) {
  const [requirements, setRequirements] = useState<SupervisorDocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true); setError(null);
    getActiveSupervisorDocumentRequirements().then(rows => { if (current) setRequirements(rows); })
      .catch(failure => { if (current) { setRequirements([]); setError(failure instanceof Error ? failure.message : 'Document requirements could not be loaded.'); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [attempt]);
  return <SupervisorAppointmentGuidanceView {...props} requirements={requirements} loading={loading} error={error} onRetry={() => setAttempt(value => value + 1)} />;
}
