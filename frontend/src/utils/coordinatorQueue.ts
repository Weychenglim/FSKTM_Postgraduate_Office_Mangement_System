import { getCoordinatorRequests, type BrowseParams, type BrowsePage, type CoordinatorRequestRow } from '../services/coordinatorWorkspaceApi';
export type NextCoordinatorRequest = CoordinatorRequestRow & {queuePage:number};
export async function nextCoordinatorRequest(params:BrowseParams, currentKey:string, load:(params:BrowseParams)=>Promise<BrowsePage<CoordinatorRequestRow>>=getCoordinatorRequests):Promise<NextCoordinatorRequest|null> {
 const page=await load(params);const index=page.results.findIndex(row=>row.key===currentKey);
 if(index<0)return null;
 const candidate=page.results[index+1];if(candidate)return {...candidate,queuePage:page.page};
 if(page.page>=page.pageCount)return null;
 const following=await load({...params,page:page.page+1});
 return following.results[0]?{...following.results[0],queuePage:following.page}:null;
}
