import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';

import type { SupervisorApplicationDocument } from '../types';
import { downloadSupervisorApplicationDocument } from '../services';
import { formatSupervisorDocumentSize } from '../utils/supervisorDocuments';
import { PortalButton, StatusBadge } from './PortalPrimitives';

interface Props {
  applicationId?: number | string;
  documents?: SupervisorApplicationDocument[];
  compact?: boolean;
}

export const SupervisorDocumentsList: React.FC<Props> = ({
  applicationId,
  documents = [],
  compact = false,
}) => {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (document: SupervisorApplicationDocument) => {
    if (!applicationId || document.availability !== 'AVAILABLE') return;
    setDownloadingId(document.id);
    setError(null);
    try {
      const blob = await downloadSupervisorApplicationDocument(applicationId, document);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Document could not be downloaded.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (documents.length === 0) {
    return <p className="text-xs font-semibold text-slate-400">No supporting documents were recorded.</p>;
  }

  return (
    <div className="space-y-2">
      {documents.map((document) => (
        <div key={document.id} className={`flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="h-4 w-4 shrink-0 text-rose-500" />
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold text-slate-800">{document.name}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                {document.requirementLabel} · {formatSupervisorDocumentSize(document.size)}
              </p>
            </div>
          </div>
          {document.availability === 'AVAILABLE' ? (
            <PortalButton
              type="button"
              variant="ghost"
              size="icon"
              icon={Download}
              title={`Download ${document.name}`}
              disabled={downloadingId === document.id}
              onClick={() => download(document)}
            />
          ) : (
            <StatusBadge tone="neutral">Unavailable</StatusBadge>
          )}
        </div>
      ))}
      {error && <p className="text-[10px] font-bold text-rose-600">{error}</p>}
    </div>
  );
};
