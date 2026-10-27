/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, BookOpen, Bot, ChevronRight, FileText, LifeBuoy, MessageCircleQuestion, RotateCcw, Send } from 'lucide-react';
import type { FaqLink, FaqReply, FaqStart } from '../types';
import { ApiError } from '../services/apiClient';
import { askFaq, downloadFaqDocument, getFaqStart, openFaqAnswer, sendFaqFeedback } from '../services/faqApi';
import { FAQ_PORTAL_LINKS, askedDifferently } from '../utils/faqText';
import { passageSource } from '../utils/faqOffice';
import { PageHeader, PortalButton } from './PortalPrimitives';
import { AppointmentIcon, AppointmentSection } from './AppointmentPrimitives';
import { AlertMessage } from './AlertMessage';
import { FaqText } from './FaqText';

type Feedback = 'none' | 'sending' | 'yes' | 'no';

type ChatItem =
  | { kind: 'you'; id: number; text: string }
  | { kind: 'reply'; id: number; asked: string; typed: boolean; reply: FaqReply; feedback: Feedback; contact: string }
  | { kind: 'topic'; id: number; name: string; questions: FaqLink[] }
  | { kind: 'problem'; id: number; text: string; retry?: () => void };

type NewItem = ChatItem extends infer Item ? (Item extends ChatItem ? Omit<Item, 'id'> : never) : never;

const PASSED_ON = 'Your question has been passed to the office, without your name, so they can add an answer.';
const OPTION = 'flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-[13px] font-semibold text-brand-navy transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';
const SMALL_NOTE = 'text-[12px] font-medium text-slate-500';

const problemText = (err: unknown) =>
  err instanceof ApiError && err.status === 429
    ? 'You have asked a lot of questions in a short time. Please wait a moment, then try again.'
    : 'Something went wrong while looking for an answer.';

const AssistantRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-3">
    <AppointmentIcon icon={Bot} tone="brand" />
    <div className="min-w-0 max-w-2xl flex-1 space-y-3 rounded-2xl rounded-tl-md border border-slate-200 bg-slate-50 px-4 py-3.5 text-[13px] leading-relaxed text-slate-700">
      <span className="sr-only">FAQ Chatbot:</span>
      {children}
    </div>
  </div>
);

const QuestionList: React.FC<{ questions: FaqLink[]; disabled: boolean; onPick: (link: FaqLink) => void }> = ({ questions, disabled, onPick }) => (
  <div className="space-y-2">
    {questions.map(link => (
      <button key={link.id} type="button" disabled={disabled} className={OPTION} onClick={() => onPick(link)}>
        <span className="min-w-0 [overflow-wrap:anywhere]">{link.question}</span>
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
    ))}
  </div>
);

const ContactBox: React.FC<{ text: string; passedOn?: boolean }> = ({ text, passedOn = true }) => (
  <AlertMessage
    type="info"
    title="Please contact the PG Office"
    message={
      <>
        <p className="whitespace-pre-line">{text}</p>
        {passedOn && <p className="mt-2 text-[12px] opacity-80">{PASSED_ON}</p>}
      </>
    }
  />
);

export const StudentFAQChatbot: React.FC = () => {
  const navigate = useNavigate();
  const [start, setStart] = useState<FaqStart | null>(null);
  const [startProblem, setStartProblem] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const nextId = useRef(1);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const hasAsked = items.length > 0;

  const loadStart = useCallback(() => {
    setStartProblem(false);
    getFaqStart().then(setStart).catch(() => setStartProblem(true));
  }, []);

  useEffect(loadStart, [loadStart]);

  // The newest message and the question box stay in view as the page grows.
  useEffect(() => {
    if (items.length || busy) composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [items.length, busy]);

  // The question box grows with what is typed instead of scrolling inside itself.
  useLayoutEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [input]);

  const add = (item: NewItem) => setItems(current => [...current, { ...item, id: nextId.current++ } as ChatItem]);

  const update = (id: number, change: Partial<Extract<ChatItem, { kind: 'reply' }>>) =>
    setItems(current => current.map(item => (item.id === id && item.kind === 'reply' ? { ...item, ...change } : item)));

  const run = async (asked: string, typed: boolean, load: () => Promise<FaqReply>) => {
    setBusy(true);
    try {
      add({ kind: 'reply', asked, typed, reply: await load(), feedback: 'none', contact: '' });
    } catch (err) {
      add({ kind: 'problem', text: problemText(err), retry: () => void run(asked, typed, load) });
    } finally {
      setBusy(false);
    }
  };

  const ask = (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setInput('');
    add({ kind: 'you', text: question });
    void run(question, true, () => askFaq(question));
  };

  const pick = (link: FaqLink, from?: FaqReply) => {
    if (busy) return;
    add({ kind: 'you', text: link.question });
    const asked = from?.outcome === 'CHOICES' ? { questionId: from.questionId, token: from.token } : undefined;
    void run(link.question, false, () => openFaqAnswer(link.id, asked));
  };

  const showTopic = (topic: FaqStart['categories'][number]) => {
    if (busy) return;
    add({ kind: 'you', text: topic.name });
    add({ kind: 'topic', name: topic.name, questions: topic.questions });
  };

  const startOver = () => {
    setItems([]);
    setInput('');
    inputRef.current?.focus();
  };

  const feedback = async (item: Extract<ChatItem, { kind: 'reply' }>, helpful: boolean) => {
    update(item.id, { feedback: 'sending' });
    try {
      const result = await sendFaqFeedback(item.reply.questionId, item.reply.token, helpful);
      update(item.id, { feedback: helpful ? 'yes' : 'no', contact: result.contactText });
    } catch {
      update(item.id, { feedback: helpful ? 'yes' : 'no', contact: helpful ? '' : start?.contactText ?? '' });
    }
  };

  const feedbackRow = (item: Extract<ChatItem, { kind: 'reply' }>) =>
    item.feedback === 'none' || item.feedback === 'sending' ? (
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
        <span className={SMALL_NOTE}>Did this help?</span>
        <PortalButton size="sm" disabled={item.feedback === 'sending'} onClick={() => void feedback(item, true)}>Yes</PortalButton>
        <PortalButton size="sm" disabled={item.feedback === 'sending'} onClick={() => void feedback(item, false)}>No</PortalButton>
      </div>
    ) : item.feedback === 'yes' ? (
      <p className={`${SMALL_NOTE} border-t border-slate-200 pt-3`}>Thanks for letting us know.</p>
    ) : (
      <>
        <p>Sorry about that.</p>
        <ContactBox text={item.contact || start?.contactText || ''} />
      </>
    );

  const openDocument = async (documentId: string, fileName: string) => {
    try {
      await downloadFaqDocument(documentId, fileName);
    } catch {
      add({ kind: 'problem', text: 'The document could not be opened. It may have been removed.' });
    }
  };

  const renderReply = (item: Extract<ChatItem, { kind: 'reply' }>) => {
    const { reply } = item;
    if (reply.outcome === 'DOCUMENT' && reply.passage) {
      const passage = reply.passage;
      return (
        <AssistantRow>
          <p className="card-label">{passageSource(passage)}</p>
          <blockquote className="whitespace-pre-line border-l-4 border-slate-300 pl-4 text-slate-700 [overflow-wrap:anywhere]">{passage.text}</blockquote>
          <p className={SMALL_NOTE}>This is a passage from a document the PG Office uploaded, not a reviewed FAQ answer.</p>
          <PortalButton size="sm" icon={FileText} onClick={() => void openDocument(passage.documentId, passage.fileName)}>
            Open document
          </PortalButton>
          {feedbackRow(item)}
        </AssistantRow>
      );
    }
    if (reply.outcome === 'NO_MATCH') {
      return (
        <AssistantRow>
          <p>I couldn't find this in the FAQ.</p>
          <ContactBox text={reply.contactText} />
        </AssistantRow>
      );
    }
    if (reply.outcome === 'CHOICES') {
      return (
        <AssistantRow>
          <p>I found a few questions that might match. Which one did you mean?</p>
          <QuestionList questions={reply.choices} disabled={busy} onPick={choice => pick(choice, reply)} />
          {item.feedback === 'none' && (
            <PortalButton size="sm" variant="ghost" onClick={() => void feedback(item, false)}>None of these</PortalButton>
          )}
          {item.feedback === 'no' && (
            <>
              <p>Sorry about that.</p>
              <ContactBox text={item.contact || start?.contactText || ''} />
            </>
          )}
        </AssistantRow>
      );
    }
    const answer = reply.answer!;
    const button = answer.portalLink ? FAQ_PORTAL_LINKS[answer.portalLink] : null;
    return (
      <AssistantRow>
        {item.typed && askedDifferently(item.asked, answer.question) && <p className="card-label">Matched: {answer.question}</p>}
        <FaqText text={answer.answer} className="text-[13px] font-medium text-slate-800" />
        {button && (
          <PortalButton size="sm" variant="primary" icon={ArrowRight} iconPosition="right" onClick={() => navigate(button.route)}>
            {button.label}
          </PortalButton>
        )}
        <p className="card-caption">From the PG Office FAQ · {answer.category}</p>
        {reply.related.length > 0 && (
          <div className="space-y-2">
            <p className="card-label">Related questions</p>
            <QuestionList questions={reply.related} disabled={busy} onPick={link => pick(link)} />
          </div>
        )}
        {feedbackRow(item)}
      </AssistantRow>
    );
  };

  return (
    <div id="student-faq-chatbot-view" className="space-y-6 text-left font-sans animate-fade-in">
      <PageHeader
        title="FAQ Chatbot"
        subtitle="Ask about postgraduate procedures. Answers come from the PG Office FAQ."
        actions={hasAsked ? <PortalButton icon={RotateCcw} onClick={startOver}>Start over</PortalButton> : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section aria-label="Chat" className="app-card overflow-hidden shadow-sm">
          <header className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
            <AppointmentIcon icon={MessageCircleQuestion} tone="info" />
            <div className="min-w-0">
              <h2 className="section-label">Ask a question</h2>
              <p className="card-description mt-1">Type it in your own words, or pick a topic. The chatbot can't see your own records.</p>
            </div>
          </header>

          <div role="log" aria-live="polite" aria-label="Conversation" className="space-y-5 px-5 py-6">
            <AssistantRow>
              <p>Hi! I answer questions about postgraduate procedures using the PG Office FAQ.</p>
              <p>Type your question below, or choose a topic to see its questions.</p>
            </AssistantRow>

            {items.map(item => {
              if (item.kind === 'you') {
                return (
                  <div key={item.id} className="flex justify-end">
                    <div className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-tr-md bg-brand-navy px-4 py-3 text-[13px] font-medium leading-relaxed text-white [overflow-wrap:anywhere]">
                      <span className="sr-only">You: </span>
                      {item.text}
                    </div>
                  </div>
                );
              }
              if (item.kind === 'topic') {
                return (
                  <AssistantRow key={item.id}>
                    <p>Questions about {item.name}:</p>
                    <QuestionList questions={item.questions} disabled={busy} onPick={link => pick(link)} />
                  </AssistantRow>
                );
              }
              if (item.kind === 'problem') {
                return (
                  <AssistantRow key={item.id}>
                    <p role="alert">{item.text}</p>
                    {item.retry && <PortalButton size="sm" icon={RotateCcw} disabled={busy} onClick={item.retry}>Try again</PortalButton>}
                  </AssistantRow>
                );
              }
              return <React.Fragment key={item.id}>{renderReply(item)}</React.Fragment>;
            })}

            {busy && (
              <div className="flex items-center gap-3">
                <AppointmentIcon icon={Bot} tone="brand" />
                <p role="status" className={`${SMALL_NOTE} flex items-center gap-2`}>
                  <span aria-hidden="true" className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                  </span>
                  Looking for an answer…
                </p>
              </div>
            )}
          </div>

          <form
            ref={composerRef}
            className="space-y-2 border-t border-slate-200 bg-slate-50/70 px-5 py-4"
            onSubmit={event => {
              event.preventDefault();
              ask(input);
            }}
          >
            <label htmlFor="faq-question" className="sr-only">Your question</label>
            <div className="flex items-end gap-2">
              <textarea
                id="faq-question"
                ref={inputRef}
                rows={1}
                maxLength={300}
                placeholder="Type your question"
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  // Enter while an IME is composing picks a candidate; it must not send.
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    ask(input);
                  }
                }}
                className="form-control form-control-md flex-1 resize-none overflow-hidden text-[13px] font-medium leading-relaxed"
              />
              <PortalButton type="submit" variant="primary" icon={Send} disabled={!input.trim() || busy}>
                Send
              </PortalButton>
            </div>
            <p className="card-caption">Press Enter to send, or Shift and Enter for a new line.</p>
          </form>
        </section>

        <div className="space-y-6">
          <AppointmentSection title="Browse by topic" description="See the questions for each part of your studies." icon={BookOpen}>
            {start ? (
              <div className="space-y-2">
                {start.categories.map(topic => (
                  <button key={topic.id} type="button" disabled={busy} className={OPTION} onClick={() => showTopic(topic)}>
                    <span className="min-w-0">
                      <span className="block">{topic.name}</span>
                      <span className="card-caption">{topic.questions.length} question{topic.questions.length === 1 ? '' : 's'}</span>
                    </span>
                    <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            ) : startProblem ? (
              <div className="space-y-2">
                <p className="card-description">The topics could not be loaded.</p>
                <PortalButton size="sm" icon={RotateCcw} onClick={loadStart}>Try again</PortalButton>
              </div>
            ) : (
              <p className="card-description">Loading topics…</p>
            )}
          </AppointmentSection>

          {start && start.commonQuestions.length > 0 && (
            <AppointmentSection title="Common questions" description="What students ask most." icon={MessageCircleQuestion}>
              <div className="space-y-2">
                {start.commonQuestions.map(question => (
                  <button key={question} type="button" disabled={busy} className={OPTION} onClick={() => ask(question)}>
                    <span className="min-w-0 [overflow-wrap:anywhere]">{question}</span>
                    <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            </AppointmentSection>
          )}

          <AppointmentSection title="About your own case" description="The chatbot answers general questions only." icon={LifeBuoy}>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-700">
              {start?.contactText || 'For anything about your own application, records or results, contact the PG Office.'}
            </p>
          </AppointmentSection>
        </div>
      </div>
    </div>
  );
};
