import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { StatusBadge, type BadgeTone } from './PortalPrimitives';

const iconTone: Record<BadgeTone, string> = {
  brand: 'bg-slate-100 text-brand-navy ring-slate-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  info: 'bg-blue-50 text-blue-700 ring-blue-100',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-800 ring-amber-100',
  danger: 'bg-rose-50 text-rose-700 ring-rose-100',
};

export function MarksIcon({ icon: Icon, tone = 'info' }: { icon: LucideIcon; tone?: BadgeTone }) {
  return <span aria-hidden="true" className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${iconTone[tone]}`}>
    <Icon aria-hidden="true" focusable="false" className="h-[18px] w-[18px]" strokeWidth={1.75} />
  </span>;
}

export function MarksHeading({ children, icon, as: Tag = 'h2', className = '' }: {
  children: React.ReactNode; icon?: LucideIcon; as?: 'h2' | 'h3'; className?: string;
}) {
  return <Tag className={`flex min-w-0 items-center gap-3 text-base font-semibold leading-relaxed text-brand-navy ${className}`}>
    {icon ? <MarksIcon icon={icon} /> : null}<span className="min-w-0 break-words">{children}</span>
  </Tag>;
}

export function MarksSummaryCard({ title, value, description, icon, badge, tone = 'neutral', onClick, state = false }: {
  title: string; value: React.ReactNode; description?: string; icon?: LucideIcon;
  badge?: string; tone?: BadgeTone; onClick?: () => void; state?: boolean;
}) {
  const Tag = onClick ? 'button' : 'article';
  return <Tag {...(onClick ? { type: 'button' as const, onClick } : {})} aria-label={onClick && (typeof value === 'number' || typeof value === 'string') ? `${title}: ${value}` : title}
    className={`min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-left shadow-sm ${onClick ? 'w-full cursor-pointer hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' : ''}`}>
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">{icon ? <MarksIcon icon={icon} /> : null}<span className="card-label min-w-0 break-words">{title}</span></div>
    <div className="flex flex-wrap items-center gap-2"><span className={state ? 'text-base font-semibold leading-relaxed text-brand-navy break-words' : 'card-metric break-words'}>{value}</span>{badge ? <StatusBadge tone={tone}>{badge}</StatusBadge> : null}</div>
    {description ? <p className="card-description">{description}</p> : null}
  </Tag>;
}
