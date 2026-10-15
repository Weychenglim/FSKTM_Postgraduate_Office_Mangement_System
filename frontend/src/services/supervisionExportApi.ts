import { requestBlob } from './apiClient';
import { browseQuery, type BrowseParams } from './coordinatorWorkspaceApi';

export type SupervisionExportRole = 'Office Staff/Admin' | 'Programme Coordinator';

/** Export every matching assignment; UI pagination is deliberately excluded. */
export async function downloadSupervisionWorkbook(role: SupervisionExportRole, params: BrowseParams): Promise<void> {
  const { page: _page, size: _size, view: _view, ...filters } = params;
  const scope = role === 'Office Staff/Admin' ? 'office-workspace' : 'coordinator-workspace';
  const blob = await requestBlob(`/appointments/${scope}/supervision-export/?${browseQuery(filters)}`);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filters.supervisor ? `supervision_lecturer_${Number(filters.supervisor)}.xlsx` : 'supervision_list.xlsx';
  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
