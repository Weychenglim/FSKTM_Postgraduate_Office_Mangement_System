/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  onClick,
  isLoading = false,
  className = '',
  ...props
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || props.disabled}
      className={`w-full py-4 px-6 bg-brand-navy text-white font-extrabold text-xs tracking-widest uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-[#1a2b4b] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand-navy/30 disabled:opacity-75 disabled:cursor-not-allowed select-none transition-all duration-200 cursor-pointer shadow-sm ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
          <span>Verifying Credentials...</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </>
      )}
    </button>
  );
};
