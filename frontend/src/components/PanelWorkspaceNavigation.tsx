import React from 'react';
export type PanelWorkspaceRole='office'|'coordinator'|'lecturer';
export type PanelWorkspaceSection='attention'|'requests'|'supervisees'|'appointments';
/** App reserves `student` for explicitly starting a nomination. Details must not trigger it. */
export function panelSuperviseeDetailParams(current:URLSearchParams,studentId:string):URLSearchParams {
  const next=new URLSearchParams(current);
  next.set('panelSection','supervisees');
  next.set('panelStudent',studentId);
  next.delete('student');
  return next;
}
export function panelWorkspaceTabs(role:PanelWorkspaceRole):{id:PanelWorkspaceSection;label:string}[]{
  if(role==='office')return [{id:'attention',label:'Needs attention'},{id:'requests',label:'Appointment requests'},{id:'appointments',label:'Panel assignments'}];
  if(role==='coordinator')return [{id:'requests',label:'Appointment requests'},{id:'appointments',label:'Panel assignments'}];
  return [{id:'requests',label:'Appointment requests'},{id:'supervisees',label:'My supervisees'},{id:'appointments',label:'My Panel students'}];
}
export function panelWorkspaceSection(role:PanelWorkspaceRole,value?:string|null,legacy?:string):PanelWorkspaceSection {
  return panelWorkspaceTabs(role).find(v=>v.id===value)?.id??(role==='lecturer'&&legacy==='submitted'?'supervisees':role==='office'?'attention':'requests');
}
export function PanelWorkspaceNavigation({role,section,onChange}:{role:PanelWorkspaceRole;section:PanelWorkspaceSection;onChange:(section:PanelWorkspaceSection)=>void}) {
  return <nav aria-label="Panel workspace" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">{panelWorkspaceTabs(role).map(tab=><button type="button" key={tab.id} aria-current={section===tab.id?'page':undefined} onClick={()=>onChange(tab.id)} className={`card-value rounded-lg px-4 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy ${section===tab.id?'bg-brand-navy text-white':'text-slate-600 hover:bg-white'}`}>{tab.label}</button>)}</nav>;
}
