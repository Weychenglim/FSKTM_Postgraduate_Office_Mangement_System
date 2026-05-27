/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface FormCardProps {
  id?: string;
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FormCard: React.FC<FormCardProps> = ({
  id = 'form-card',
  title,
  icon,
  children,
  className = ''
}) => {
  return (
    <div
      id={id}
      className={`bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 text-left shadow-[0_8px_30px_rgb(241,245,249,0.5)] ${className}`}
    >
      {(title || icon) && (
        <div id={`${id}-header`} className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
          {icon && <div className="text-blue-600 shrink-0">{icon}</div>}
          {title && (
            <h3 className="text-lg font-extrabold text-[#0c1424] tracking-tight">
              {title}
            </h3>
          )}
        </div>
      )}
      <div id={`${id}-body`}>{children}</div>
    </div>
  );
};
