import React from 'react';
import { RefreshCw } from 'lucide-react';
import { PortalButton, ProgressBar, StatusBadge } from './PortalPrimitives';

export function AppointmentSection({ title, description, children, onRefresh, refreshing = false, id, actions }: {
  title: string; description?: string; children: React.ReactNode; onRefresh?: () => void; refreshing?: boolean; id?: string; actions?: React.ReactNode;
}) {
  return <section id={id} aria-label={title} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="section-label">{title}</h2>{description ? <p className="card-description mt-1">{description}</p> : null}</div><div className="flex flex-wrap gap-2">{actions}{onRefresh ? <PortalButton size="sm" icon={RefreshCw} disabled={refreshing} onClick={onRefresh}>Refresh appointments</PortalButton> : null}</div></div>
    {children}
  </section>;
}

export function AppointmentMemberCard({ label, name, status, tone, children, actions }: {
  label: string; name: string; status: string; tone: React.ComponentProps<typeof StatusBadge>['tone']; children?: React.ReactNode; actions?: React.ReactNode;
}) {
  return <article className="space-y-2 rounded-xl border border-slate-200 p-4">
    <p className="card-label">{label}</p><h3 className="section-label break-words">{name}</h3><StatusBadge tone={tone}>{status}</StatusBadge>
    {children}{actions ? <div className="flex flex-wrap gap-2 pt-2">{actions}</div> : null}
  </article>;
}

export type AppointmentGuidanceCard = { title: string; content: React.ReactNode };

export function AppointmentGuidance({ cards, onShowFAQChatbot }: { cards: AppointmentGuidanceCard[]; onShowFAQChatbot?: () => void }) {
  return <section aria-label="Appointment guidance" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="section-label">Appointment guidance</h2>{onShowFAQChatbot ? <PortalButton size="sm" onClick={onShowFAQChatbot}>Appointment FAQ</PortalButton> : null}</div>
    <div className="grid gap-5 sm:grid-cols-2">{cards.map(card => <article key={card.title} className="space-y-2"><h3 className="card-value">{card.title}</h3><div className="card-description space-y-2 text-slate-700">{card.content}</div></article>)}</div>
  </section>;
}

export function AppointmentSummaryCard({ title, value, description, badge, tone = 'neutral', progress }: {
  title: string; value: React.ReactNode; description?: string; badge?: string; tone?: React.ComponentProps<typeof StatusBadge>['tone']; progress?: { current: number; max: number };
}) {
  return <article aria-label={title} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="card-label">{title}</h2>{badge ? <StatusBadge tone={tone}>{badge}</StatusBadge> : null}</div>
    <p className="card-metric">{progress ? <>{progress.current} <span className="font-medium text-slate-400">/ {progress.max}</span></> : value}</p>
    {progress ? <ProgressBar value={progress.current} max={progress.max} tone="info" /> : null}
    {description ? <p className="card-description">{description}</p> : null}
  </article>;
}
