import React from 'react';
import type {SupervisorAcceptanceCapacity} from '../types';
import {AlertMessage} from './AlertMessage';

export function PanelCapacityNotice({capacity}:{capacity?:SupervisorAcceptanceCapacity|null}) {
  if(!capacity)return <p className="card-description">Capacity information unavailable. Refresh to check availability.</p>;
  const availability=capacity.limit==null||capacity.state==='NOT_CONFIGURED'?'Availability not configured'
    :['TEMPORARILY_UNAVAILABLE','INELIGIBLE'].includes(capacity.state)?'Unavailable for new requests'
    :capacity.availableSlots===0?'No places available':`${capacity.availableSlots} ${capacity.availableSlots===1?'place':'places'} available`;
  return <p className="card-description" aria-label="Current request capacity">{capacity.activeLoad} active · {capacity.reservedLoad} reserved · {availability}{capacity.limit!=null?` · Limit ${capacity.limit}`:''}</p>;
}

export function PanelAcceptanceMessage({capacity}:{capacity?:SupervisorAcceptanceCapacity|null}) {
  const other=Math.max(0,(capacity?.pendingRequests??0)-1);
  return capacity?.state==='AVAILABLE'&&capacity.availableSlots===1
    ? <AlertMessage type="warning" title="Last available place" message={<>
        <p>Accepting reserves this place until Coordinator approval.</p>
        {other>0?<p className="mt-2">{other} other pending {other===1?'nomination':'nominations'} may close after final approval.</p>:null}
      </>}/>
    : <>Acceptance reserves a place while the Programme Coordinator makes the final decision.</>;
}
