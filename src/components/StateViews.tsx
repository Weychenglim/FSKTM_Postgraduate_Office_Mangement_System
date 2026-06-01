/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared async UI states for service-backed screens: loading, empty, and error.
 * Pair these with the *Api.ts services so every data screen handles the three
 * states the backend will introduce. See StudentRegistry / MarkEntryRecords for
 * the reference usage pattern.
 */
import React from 'react';
import { AlertTriangle, Inbox, Loader2, LucideIcon, RotateCw } from 'lucide-react';
import { PortalButton } from './PortalPrimitives';

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading…',
  className = '',
}) => (
  <div
    role="status"
    aria-live="polite"
    className={joinClasses(
      'flex flex-col items-center justify-center gap-3 py-16 text-center',
      className
    )}
  >
    <Loader2 className="w-7 h-7 text-brand-navy animate-spin" />
    <span className="text-xs font-bold text-slate-500 tracking-wide">{message}</span>
  </div>
);

interface SkeletonRowsProps {
  rows?: number;
  columns?: number;
}

/** Lightweight table skeleton for loading data tables. */
export const SkeletonRows: React.FC<SkeletonRowsProps> = ({ rows = 5, columns = 4 }) => (
  <div className="divide-y divide-slate-100" aria-hidden="true">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex items-center gap-4 px-5 py-4">
        {Array.from({ length: columns }).map((_, c) => (
          <div
            key={c}
            className="h-3.5 rounded bg-slate-200/70 animate-pulse"
            style={{ width: `${100 / columns}%` }}
          />
        ))}
      </div>
    ))}
  </div>
);

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing here yet',
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className = '',
}) => (
  <div className={joinClasses('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
      <Icon className="w-6 h-6 text-slate-400" />
    </div>
    <div className="space-y-1">
      <h3 className="text-sm font-extrabold text-slate-700">{title}</h3>
      {description && (
        <p className="text-xs font-medium text-slate-500 max-w-sm leading-relaxed">{description}</p>
      )}
    </div>
    {actionLabel && onAction && (
      <PortalButton variant="primary" size="sm" onClick={onAction} className="mt-1">
        {actionLabel}
      </PortalButton>
    )}
  </div>
);

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Something went wrong while loading this data.',
  onRetry,
  className = '',
}) => (
  <div
    role="alert"
    className={joinClasses('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}
  >
    <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-150 flex items-center justify-center">
      <AlertTriangle className="w-6 h-6 text-rose-500" />
    </div>
    <div className="space-y-1">
      <h3 className="text-sm font-extrabold text-slate-700">Couldn’t load data</h3>
      <p className="text-xs font-medium text-slate-500 max-w-sm leading-relaxed">{message}</p>
    </div>
    {onRetry && (
      <PortalButton variant="secondary" size="sm" icon={RotateCw} onClick={onRetry} className="mt-1">
        Retry
      </PortalButton>
    )}
  </div>
);
