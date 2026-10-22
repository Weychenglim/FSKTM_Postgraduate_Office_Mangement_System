import React,{useRef,useEffect,useState} from 'react';
import {PortalButton} from './PortalPrimitives';
import {Download} from 'lucide-react';
import {exportOfficeBrowsePage,type CsvColumn} from '../utils/officeSupervisorExports';
import type {BrowsePage,BrowseParams} from '../services/coordinatorWorkspaceApi';

export function OfficeWorkspaceExport<T>({filename,loader,params,columns,disabled=false}:{filename:string;loader:(params:BrowseParams)=>Promise<BrowsePage<T>>;params:BrowseParams;columns:CsvColumn<T>[];disabled?:boolean}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const exportRecords=async()=>{
    if(busy)return;
    setBusy(true);setError(null);setNotice(null);
    try{const count=await exportOfficeBrowsePage(filename,loader,params,columns);if(mounted.current)setNotice(`Exported ${count} matching records.`);}
    catch(error){if(mounted.current)setError(error instanceof Error?error.message:'Export could not be completed.');}
    finally{if(mounted.current)setBusy(false);}
  };
  return <div className="max-w-sm space-y-1"><PortalButton variant="primary" size="sm" icon={Download} title="Download all matching records across every page as Excel" aria-description="Includes all filtered records across every page" disabled={disabled||busy} isLoading={busy} onClick={()=>void exportRecords()}>Export Excel</PortalButton>{error?<p role="alert" className="card-description text-rose-700">{error}</p>:null}{notice?<p role="status" className="card-description">{notice}</p>:null}</div>;
}
