import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ListState, useListState } from './ListState';

const memory = new Map<string, unknown>();
let change: React.Dispatch<React.SetStateAction<number>>;
function List({ module = 'marks' }) {
  const [page, setPage] = useListState(module, 'page', 1);
  change = setPage;
  return <span>{page}</span>;
}
const render = (module = 'marks', state = memory) => renderToStaticMarkup(<ListState.Provider value={state}><List module={module} /></ListState.Provider>);
assert.equal(render(), '<span>1</span>');
change!(3);
change!(value => value + 1);
assert.equal(render(), '<span>4</span>', 'Returning to a remounted owner list retains its page');
assert.equal(render('panel'), '<span>1</span>', 'Different modules have separate list state');
assert.equal(render('marks', new Map()), '<span>1</span>', 'A new authenticated shell starts with clean list state');
console.log('List return retains state across record remounts without mixing modules or sessions');
