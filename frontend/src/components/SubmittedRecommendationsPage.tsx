import React,{useCallback,useEffect,useState} from 'react';
import type {SubmittedRecommendation} from '../types';
import type {DecisionOutcome} from '../utils/decisionSubmission';
import {getPanelRecommendations} from '../services';
import {toSubmittedPanelPresentation} from '../utils/panelPresentation';
import {PanelBrowse} from './PanelBrowse';
import {RecordPage} from './RecordPage';
import {LoadingState,ErrorState} from './StateViews';
import {RecommendationDetailsDrawer} from './RecommendationDetailsDrawer';
interface Props {onBack:()=>void;recommendations?:SubmittedRecommendation[];onViewRecommendation?:(id:string)=>void;onCancelRecommendation?:(row:SubmittedRecommendation,reason:string)=>Promise<void|DecisionOutcome>|void;}
export function SubmittedRecommendationsPage({onBack,recommendations:supplied,onViewRecommendation,onCancelRecommendation}:Props){
 const [rows,setRows]=useState<SubmittedRecommendation[]>([]),[loading,setLoading]=useState(!supplied),[error,setError]=useState<string|null>(null),[selected,setSelected]=useState<string|null>(null);
 const load=useCallback(async()=>{setLoading(true);setError(null);try{setRows(await getPanelRecommendations());}catch(e){setError(e instanceof Error?e.message:'Submitted recommendations could not be loaded.');}finally{setLoading(false);}},[]);
 useEffect(()=>{if(!supplied)void load();},[supplied,load]);
 const records=supplied??rows;
 const current=records.find(r=>String(r.recommendationId??r.id)===selected)??null;
 if(current)return <RecommendationDetailsDrawer isOpen recommendation={current} onClose={()=>setSelected(null)} onCancelRecommendation={onCancelRecommendation}/>;
 return <RecordPage title="Submitted recommendations" backLabel="Back to Panel Appointments" onBack={onBack}>{loading?<LoadingState message="Loading submitted recommendations…"/>:error?<ErrorState message={error} onRetry={load}/>:<PanelBrowse scope="submitted-recommendations" title="Submitted recommendations" records={records.map(toSubmittedPanelPresentation)} onOpen={row=>{const id=String(row.id);if(onViewRecommendation)onViewRecommendation(id);else setSelected(id);}}/>}</RecordPage>;
}
