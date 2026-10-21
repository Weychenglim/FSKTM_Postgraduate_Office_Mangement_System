import React from 'react';
import {PortalButton, PortalCard} from './PortalPrimitives';

/** Office tool composition only; shared portal primitives keep their system styling. */
export function OfficeToolContext({children, label = 'Semester context'}: {children: React.ReactNode; label?: string}) {
  return <PortalCard padding="sm" role="region" aria-label={label} className="office-tool-context">{children}</PortalCard>;
}

export function OfficeToolSection({title, description, actions, children, className = ''}: {
  title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return <PortalCard padding="none" className={`office-tool-section ${className}`}>
    <div className="office-tool-section-heading">
      <div className="min-w-0"><h2 className="section-heading">{title}</h2>{description && <p className="card-description mt-1">{description}</p>}</div>
      {actions && <div className="office-tool-actions">{actions}</div>}
    </div>
    {children}
  </PortalCard>;
}

export function OfficeToolViews<T extends string>({label, value, options, onChange}: {
  label: string; value: T; options: {value: NoInfer<T>; label: string}[]; onChange: (value: T) => void;
}) {
  return <div role="group" aria-label={label} className="office-tool-views">
    {options.map(option => <PortalButton key={option.value} size="sm" aria-pressed={option.value === value}
      variant={option.value === value ? 'primary' : 'ghost'} onClick={() => onChange(option.value)}>{option.label}</PortalButton>)}
  </div>;
}
