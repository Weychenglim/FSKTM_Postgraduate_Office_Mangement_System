import type {PanelRecommendationDraft} from '../types';
import type {RequestListView} from '../components/RequestWorkspacePrimitives';
import {canActOnPanelRecord,type PanelPresentation} from './panelPresentation';

/** Review history is the authenticated lecturer's completed review, not the final workflow outcome. */
export function buildPanelReviewWorkspace(queue:PanelRecommendationDraft[],history:PanelRecommendationDraft[]) {
  const reviewedIds=new Set(history.map(row=>row.id));
  const records:PanelPresentation[]=[...new Map([...queue,...history].map(row=>[row.id,row])).values()];
  const requestViewForRecord=(row:PanelPresentation):RequestListView=>reviewedIds.has(row.id)?'history':'requests';
  return {records,requestViewForRecord,
    reviewCount:records.filter(row=>requestViewForRecord(row)==='requests'&&canActOnPanelRecord(row,'SELECTED_PANEL')).length,
    awaitingCoordinatorCount:records.filter(row=>requestViewForRecord(row)==='history'&&row.status==='PENDING_COORDINATOR').length};
}
