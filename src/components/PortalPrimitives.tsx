/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, ChevronLeft, Loader2, LucideIcon, XCircle } from 'lucide-react';

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'ghost' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface PortalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const PortalButton: React.FC<PortalButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const variantClass: Record<ButtonVariant, string> = {
    primary: 'bg-brand-navy text-white border border-brand-navy hover:bg-brand-navy-hover shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-brand-navy shadow-3xs',
    soft: 'bg-blue-50 text-blue-700 border border-blue-150 hover:bg-blue-100 shadow-3xs',
    danger: 'bg-rose-50 text-rose-700 border border-rose-150 hover:bg-rose-100 shadow-3xs',
    ghost: 'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-brand-navy',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-150 hover:bg-emerald-100 shadow-3xs'
  };

  const sizeClass: Record<ButtonSize, string> = {
    sm: 'px-3 py-2 text-[10px] rounded-lg',
    md: 'px-4 py-2.5 text-[11px] rounded-xl',
    lg: 'px-5 py-3 text-xs rounded-xl',
    icon: 'w-10 h-10 text-[0px] rounded-xl'
  };

  const iconNode = isLoading ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : Icon ? (
    <Icon className={joinClasses(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4', 'shrink-0')} />
  ) : null;

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={joinClasses(
        'inline-flex items-center justify-center gap-2 font-extrabold uppercase tracking-wider transition-all duration-200 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-navy/20',
        variantClass[variant],
        sizeClass[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {iconPosition === 'left' && iconNode}
      {children && <span>{children}</span>}
      {iconPosition === 'right' && iconNode}
    </button>
  );
};

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface PortalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  hover?: boolean;
}

export const PortalCard: React.FC<PortalCardProps> = ({
  children,
  padding = 'md',
  hover = false,
  className = '',
  ...props
}) => {
  const paddingClass: Record<CardPadding, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-5 md:p-6',
    lg: 'p-6 md:p-8'
  };

  return (
    <div
      className={joinClasses(
        'bg-white rounded-2xl border border-slate-200/80 shadow-3xs text-left',
        paddingClass[padding],
        hover && 'hover:border-slate-300 hover:shadow-sm transition-all',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backLabel?: string;
  onBack?: () => void;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  backLabel,
  onBack,
  className = ''
}) => (
  <div className={joinClasses('flex flex-col md:flex-row md:items-start md:justify-between gap-4 text-left', className)}>
    <div>
      {onBack && backLabel && (
        <button type="button" onClick={onBack} className="back-link group mb-3">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>{backLabel}</span>
        </button>
      )}
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
  </div>
);

type BadgeTone = 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';

interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  icon?: LucideIcon;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  children,
  tone = 'neutral',
  icon: Icon,
  dot = false,
  pulse = false,
  className = ''
}) => {
  const toneClass: Record<BadgeTone, { wrapper: string; dot: string }> = {
    brand: { wrapper: 'bg-indigo-50 text-brand-navy border-indigo-100', dot: 'bg-indigo-500' },
    info: { wrapper: 'bg-blue-50 text-blue-700 border-blue-150', dot: 'bg-blue-500' },
    success: { wrapper: 'bg-emerald-50 text-emerald-700 border-emerald-150', dot: 'bg-emerald-500' },
    warning: { wrapper: 'bg-amber-50 text-amber-800 border-amber-150', dot: 'bg-amber-500' },
    danger: { wrapper: 'bg-rose-50 text-rose-700 border-rose-150', dot: 'bg-rose-500' },
    neutral: { wrapper: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' }
  };

  return (
    <span className={joinClasses(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wider select-none',
      toneClass[tone].wrapper,
      className
    )}>
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {dot && <span className={joinClasses('w-1.5 h-1.5 rounded-full shrink-0', toneClass[tone].dot, pulse && 'animate-pulse')} />}
      <span>{children}</span>
    </span>
  );
};

type ToastTone = 'info' | 'success' | 'warning' | 'danger';

interface PortalToastProps {
  message: string | null;
  tone?: ToastTone;
  className?: string;
}

export const PortalToast: React.FC<PortalToastProps> = ({ message, tone = 'info', className = '' }) => {
  if (!message) return null;

  const toneClass: Record<ToastTone, { wrapper: string; icon: LucideIcon }> = {
    info: { wrapper: 'bg-brand-navy text-white border-white/10', icon: CheckCircle2 },
    success: { wrapper: 'bg-emerald-700 text-white border-emerald-500/30', icon: CheckCircle2 },
    warning: { wrapper: 'bg-amber-700 text-white border-amber-500/30', icon: CheckCircle2 },
    danger: { wrapper: 'bg-rose-700 text-white border-rose-500/30', icon: XCircle }
  };

  const Icon = toneClass[tone].icon;

  return (
    <div className={joinClasses(
      'fixed top-5 right-5 z-[70] px-5 py-3 rounded-xl shadow-sm border flex items-center gap-2.5 max-w-sm font-sans',
      toneClass[tone].wrapper,
      className
    )}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-[11px] font-bold tracking-wide leading-snug">{message}</span>
    </div>
  );
};
