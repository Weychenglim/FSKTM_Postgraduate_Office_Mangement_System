import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DecisionDialog} from './DecisionDialog';

const base={isOpen:true,title:'Reject research change?',context:'Student One · Computing',message:'The approved research profile stays unchanged.',confirmLabel:'Reject research change',successMessage:'Research change rejected.',onClose:()=>{},onConfirm:async()=>{}};
const review=renderToStaticMarkup(<DecisionDialog {...base} canConfirm={false}><label>Reason<textarea required/></label></DecisionDialog>);
assert.match(review,/aria-modal="true"/);
for(const text of ['Review decision','Student One','Computing','approved research profile','Reason','Reject research change']) assert.ok(review.includes(text),text);
assert.match(review,/disabled[^>]*>Reject research change|disabled[\s\S]*Reject research change/,'Required fields gate final confirmation');
assert.doesNotMatch(review,/Confirm decision|Request #|Reference/);
const confirmation=renderToStaticMarkup(<DecisionDialog {...base} kind="confirmation" title="Submit marks?" confirmLabel="Submit marks" busy/>);
assert.match(confirmation,/Confirm your action/);
assert.doesNotMatch(confirmation,/Review decision/,'A user confirmation must not imply another reviewer');
assert.match(confirmation,/disabled/);
console.log('Shared dialog distinguishes review from user confirmation with explicit context and gated actions');
