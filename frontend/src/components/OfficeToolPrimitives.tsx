import React from 'react';
import type {LucideIcon} from 'lucide-react';
import {AppointmentIcon} from './AppointmentPrimitives';
import {PortalButton, PortalCard} from './PortalPrimitives';

export function OfficeToolHeading({children, icon}: {
  children: React.ReactNode; icon: LucideIcon;
}) {
  return <h2 className="section-heading flex min-w-0 items-center gap-3">
    <AppointmentIcon icon={icon} tone="info"/><span className="min-w-0">{children}</span>
  </h2>;
}

/** Office tool composition only; shared portal primitives keep their system styling. */
export function OfficeToolContext({children, label = 'Semester context'}: {children: React.ReactNode; label?: string}) {
  return <PortalCard padding="sm" role="region" aria-label={label} className="office-tool-context">{children}</PortalCard>;
}

export function OfficeToolSection({title, icon, description, actions, children, className = ''}: {
  title: string; icon?: LucideIcon; description?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return <PortalCard padding="none" className={`office-tool-section ${className}`}>
    <div className="office-tool-section-heading">
      <div className="flex min-w-0 items-start gap-3">{icon && <AppointmentIcon icon={icon} tone="info"/>}<div className="min-w-0"><h2 className="section-heading">{title}</h2>{description && <p className="card-description mt-1">{description}</p>}</div></div>
      {actions && <div className="office-tool-actions">{actions}</div>}
    </div>
    {children}
  </PortalCard>;
}

export function OfficeToolViews<T extends string>({label, value, options, onChange, appearance = 'compact'}: {
  label: string; value: T; options: {value: NoInfer<T>; label: string; icon?: LucideIcon}[]; onChange: (value: T) => void; appearance?: 'compact' | 'workspace';
}) {
  // Match the sentence-case navigation used by Supervisor Appointments.
  if (appearance === 'workspace') return <div role="group" aria-label={label} className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
    {options.map(option => <button type="button" key={option.value} aria-pressed={option.value === value}
      className={`card-value inline-flex items-center gap-2 cursor-pointer rounded-lg px-4 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy ${option.value === value ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-white'}`}
      onClick={() => onChange(option.value)}>{option.icon && <option.icon size={16} strokeWidth={1.75} className="shrink-0" aria-hidden="true" focusable="false"/>}{option.label}</button>)}
  </div>;
  return <div role="group" aria-label={label} className="office-tool-views">
    {options.map(option => <PortalButton key={option.value} size="sm" icon={option.icon} aria-pressed={option.value === value}
      variant={option.value === value ? 'primary' : 'ghost'} onClick={() => onChange(option.value)}>{option.label}</PortalButton>)}
  </div>;
}
