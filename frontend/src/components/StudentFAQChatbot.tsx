/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Bot, FileText, Info, RotateCcw, Send } from 'lucide-react';
import type { FaqLink, FaqReply, FaqStart } from '../types';
import { ApiError } from '../services/apiClient';
import { askFaq, downloadFaqDocument, getFaqStart, openFaqAnswer, sendFaqFeedback } from '../services/faqApi';
import { FAQ_PORTAL_LINKS, askedDifferently } from '../utils/faqText';
import { passageSource } from '../utils/faqOffice';
import { PageHeader } from './PortalPrimitives';
import { FaqText } from './FaqText';

type Feedback = 'none' | 'sending' | 'yes' | 'no';

type ChatItem =
  | { kind: 'you'; id: number; text: string }
  | { kind: 'reply'; id: number; asked: string; typed: boolean; reply: FaqReply; feedback: Feedback; contact: string }
  | { kind: 'topic'; id: number; name: string; questions: FaqLink[] }
  | { kind: 'problem'; id: number; text: string; retry?: () => void };

type NewItem = ChatItem extends infer Item ? (Item extends ChatItem ? Omit<Item, 'id'> : never) : never;

const PASSED_ON = 'Your question has been passed to the office, without your name, so they can add an answer.';
const CHIP = 'rounded-full border border-slate-200 bg-white px-3.5 py-2 text-left text-[12px] font-semibold text-slate-700 shadow-3xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50';

const problemText = (err: unknown) =>
  err instanceof ApiError && err.status === 429
    ? 'You have asked a lot of questions in a short time. Please wait a moment, then try again.'
    : 'Something went wrong while looking for an answer.';

const AssistantRow: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label = 'FAQ Chatbot' }) => (
  <div className="flex items-start gap-3">
    <div aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-navy shadow-sm">
      <Bot className="h-4 w-4 text-indigo-300" />
    </div>
    <div className="min-w-0 flex-1 space-y-3 pt-1 text-[13px] leading-relaxed text-slate-800">
      <span className="sr-only">{label}:</span>
      {children}
    </div>
  </div>
);

const ContactBox: React.FC<{ text: string; passedOn?: boolean }> = ({ text, passedOn = true }) => (
  <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-3xs">
    <p className="font-bold text-slate-900">Please contact the PG Office</p>
    <p className="whitespace-pre-line text-slate-700">{text}</p>
    {passedOn && <p className="text-[12px] text-slate-500">{PASSED_ON}</p>}
  </div>
);

export const StudentFAQChatbot: React.FC = () => {
  const [start, setStart] = useState<FaqStart | null>(null);
  const [startProblem, setStartProblem] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const nextId = useRef(1);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const [workspaceLeft, setWorkspaceLeft] = useState(0);
  const [footerOffset, setFooterOffset] = useState(0);
  const hasAsked = items.length > 0;

  const loadStart = useCallback(() => {
    setStartProblem(false);
    getFaqStart().then(setStart).catch(() => setStartProblem(true));
  }, []);

  useEffect(loadStart, [loadStart]);

  useEffect(() => {
    const workspace = document.getElementById('portal-workspace');
    if (!workspace) return;
    const update = () => setWorkspaceLeft(workspace.getBoundingClientRect().left);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(workspace);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // The composer is pinned to the screen; once the page footer scrolls into
  // view, lift the composer above it so the footer links stay usable.
  useEffect(() => {
    const footer = document.getElementById('portal-footer');
    if (!footer) return;
    const update = () => setFooterOffset(Math.max(0, window.innerHeight - footer.getBoundingClientRect().top));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (items.length || busy) conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [items.length, busy]);

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
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
      <div className="flex items-center gap-2 text-[12px] text-slate-500">
        <span>Did this help?</span>
        <button type="button" disabled={item.feedback === 'sending'} className="rounded-lg px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-100" onClick={() => void feedback(item, true)}>Yes</button>
        <button type="button" disabled={item.feedback === 'sending'} className="rounded-lg px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-100" onClick={() => void feedback(item, false)}>No</button>
      </div>
    ) : item.feedback === 'yes' ? (
      <p className="text-[12px] text-slate-500">Thanks for letting us know.</p>
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
          <p className="text-[12px] font-semibold text-slate-500">{passageSource(passage)}</p>
          <blockquote className="whitespace-pre-line border-l-4 border-slate-300 pl-4 text-slate-700 [overflow-wrap:anywhere]">{passage.text}</blockquote>
          <p className="text-[12px] text-slate-500">This is a passage from a document the PG Office uploaded, not a reviewed FAQ answer.</p>
          <button
            type="button"
            onClick={() => void openDocument(passage.documentId, passage.fileName)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 shadow-3xs hover:bg-slate-50"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Open document
          </button>
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
          <div className="flex flex-col items-start gap-2">
            {reply.choices.map(choice => (
              <button key={choice.id} type="button" disabled={busy} className={CHIP} onClick={() => pick(choice, reply)}>
                {choice.question}
              </button>
            ))}
            {item.feedback === 'none' && (
              <button type="button" className="px-1 py-1 text-[12px] font-bold text-slate-500 hover:text-slate-800" onClick={() => void feedback(item, false)}>
                None of these
              </button>
            )}
          </div>
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
        {item.typed && askedDifferently(item.asked, answer.question) && (
          <p className="text-[12px] font-semibold text-slate-500">Matched: {answer.question}</p>
        )}
        <FaqText text={answer.answer} className="text-[13px] font-medium text-slate-800" />
        {button && (
          <Link to={button.route} className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-sm hover:bg-brand-navy-hover">
            {button.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
        <p className="text-[11px] font-semibold text-slate-400">From the PG Office FAQ · {answer.category}</p>
        {reply.related.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Related questions</p>
            <div className="flex flex-wrap gap-2">
              {reply.related.map(link => (
                <button key={link.id} type="button" disabled={busy} className={CHIP} onClick={() => pick(link)}>
                  {link.question}
                </button>
              ))}
            </div>
          </div>
        )}
        {feedbackRow(item)}
      </AssistantRow>
    );
  };

  return (
    <div id="student-faq-chatbot-view" className="space-y-8 text-left font-sans text-xs animate-fade-in">
      <PageHeader title="FAQ Chatbot" subtitle="Ask about postgraduate procedures. Answers come from the PG Office FAQ." />

      <div role="log" aria-live="polite" aria-label="Conversation" className="mx-auto max-w-3xl space-y-8">
        <AssistantRow>
          <p>
            Hi! I answer questions using the PG Office FAQ. I can't see your own records, so for anything about your own
            case, please contact the office.
          </p>
          <p>Pick a topic, or type your question below.</p>
          {start ? (
            <div className="flex flex-wrap gap-2">
              {start.categories.map(topic => (
                <button key={topic.id} type="button" disabled={busy} className={CHIP} onClick={() => showTopic(topic)}>
                  {topic.name}
                </button>
              ))}
            </div>
          ) : startProblem ? (
            <p className="text-[12px] text-slate-500">
              The topics could not be loaded.{' '}
              <button type="button" className="font-bold text-blue-700 hover:text-blue-900" onClick={loadStart}>Try again</button>
            </p>
          ) : null}
        </AssistantRow>

        {items.map(item => {
          if (item.kind === 'you') {
            return (
              <div key={item.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md border border-slate-200 bg-white px-4 py-3 text-left text-[13px] font-medium leading-relaxed text-slate-800 shadow-3xs whitespace-pre-line [overflow-wrap:anywhere]">
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
                <div className="flex flex-col items-start gap-2">
                  {item.questions.map(link => (
                    <button key={link.id} type="button" disabled={busy} className={CHIP} onClick={() => pick(link)}>
                      {link.question}
                    </button>
                  ))}
                </div>
              </AssistantRow>
            );
          }
          if (item.kind === 'problem') {
            return (
              <AssistantRow key={item.id}>
                <p role="alert">{item.text}</p>
                {item.retry && (
                  <button type="button" disabled={busy} className="inline-flex items-center gap-1.5 font-bold text-blue-700 hover:text-blue-900" onClick={item.retry}>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Try again
                  </button>
                )}
              </AssistantRow>
            );
          }
          return <React.Fragment key={item.id}>{renderReply(item)}</React.Fragment>;
        })}

        {busy && (
          <div className="flex items-center gap-3" aria-label="Looking for an answer">
            <div aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-navy shadow-sm">
              <Bot className="h-4 w-4 animate-pulse text-indigo-300" />
            </div>
            <div aria-hidden="true" className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: '0ms' }} />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: '150ms' }} />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Keeps the last message clear of the pinned composer */}
        <div ref={conversationEndRef} aria-hidden="true" className="h-48" />
      </div>

      {/* Composer pinned to the bottom of the screen */}
      <div className="pointer-events-none fixed right-0 z-20" style={{ left: workspaceLeft, bottom: footerOffset }}>
        <div className="bg-gradient-to-t from-[#f1f5f9] via-[#f1f5f9] to-transparent px-4 pb-4 pt-10">
          <div className="pointer-events-auto mx-auto max-w-3xl space-y-2.5">
            {!hasAsked && start && start.commonQuestions.length > 0 && (
              <div className="flex select-none flex-wrap items-center gap-2" aria-label="Common questions">
                {start.commonQuestions.map(question => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => ask(question)}
                    className="shrink-0 cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-650 shadow-3xs transition hover:bg-slate-50 hover:text-slate-800"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 rounded-3xl border border-slate-200 bg-white p-2 pl-4 shadow-md">
              <textarea
                ref={inputRef}
                rows={1}
                maxLength={300}
                placeholder="Type your question here..."
                aria-label="Your question"
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  // Enter while an IME is composing picks a candidate; it must not send.
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    ask(input);
                  }
                }}
                className="max-h-40 flex-1 resize-none border-none bg-transparent py-2.5 text-[13px] font-medium leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                disabled={!input.trim() || busy}
                onClick={() => ask(input)}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand-navy text-white shadow-3xs transition-all hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-brand-navy"
                title="Send"
                aria-label="Send"
              >
                <Send className="ml-0.5 h-3.5 w-3.5 shrink-0" />
              </button>
            </div>

            <div className="card-caption flex select-none items-center justify-center gap-1.5 text-center leading-normal text-slate-400">
              <Info className="h-3.5 w-3.5 shrink-0 text-slate-350" aria-hidden="true" />
              <p>Answers come from the PG Office FAQ. For anything about your own case, check with the office.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
