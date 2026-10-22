import React, { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { PortalButton } from './PortalPrimitives';
import { downloadSupervisionWorkbook, type SupervisionExportRole } from '../services/supervisionExportApi';
import type { BrowseParams } from '../services/coordinatorWorkspaceApi';

export function SupervisionWorkbookExport({ role, params, disabled = false, lecturer = false }: {
  role: SupervisionExportRole; params: BrowseParams; disabled?: boolean; lecturer?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const exportRecords = async () => {
    if (pending.current || disabled) return;
    pending.current = true;
    setBusy(true); setError(null); setNotice(null);
    try {
      await downloadSupervisionWorkbook(role, params);
      if (mounted.current) setNotice('Downloaded Excel workbook with lecturer and student views.');
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'The supervision list could not be exported. Try again.');
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return <div className="max-w-sm space-y-1">
    <PortalButton variant="primary" size="sm" icon={Download} aria-description="Includes all filtered records across every page" title={lecturer ? 'Download this lecturer’s matching students across every page as Excel' : 'Download all matching supervision records across every page as Excel'} disabled={disabled || busy} isLoading={busy} onClick={() => void exportRecords()}>
      Export Excel
    </PortalButton>
    {error ? <p role="alert" className="card-description text-rose-700">{error}</p> : null}
    {notice ? <p role="status" className="card-description">{notice}</p> : null}
  </div>;
}
