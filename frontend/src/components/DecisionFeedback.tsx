import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {PortalToast} from './PortalPrimitives';

type FeedbackTone = 'success' | 'warning' | 'danger';
const DecisionFeedback = createContext<((message: string, tone: FeedbackTone) => void) | null>(null);

/** Outcome feedback survives a saved record leaving its list, but never a session change. */
export function DecisionFeedbackProvider({scopeKey, children}: {scopeKey: string; children: React.ReactNode}) {
  const [notice,setNotice] = useState<{message:string; tone:FeedbackTone} | null>(null);
  const mounted = useRef(true);
  const currentScope = useRef(scopeKey); currentScope.current = scopeKey;
  useEffect(() => {mounted.current=true; return () => {mounted.current=false;};}, []);
  useEffect(() => {setNotice(null);}, [scopeKey]);
  const publish = useMemo(() => (message: string, tone: FeedbackTone) => {
    if (mounted.current && currentScope.current === scopeKey) setNotice({message,tone});
  }, [scopeKey]);
  return <DecisionFeedback.Provider value={publish}>{children}<PortalToast message={notice?.message ?? null} tone={notice?.tone} onClose={()=>setNotice(null)}/></DecisionFeedback.Provider>;
}

export const useDecisionFeedback = () => useContext(DecisionFeedback);
