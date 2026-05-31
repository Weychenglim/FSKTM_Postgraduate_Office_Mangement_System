/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { motion } from 'motion/react';

interface AlertMessageProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
}

export const AlertMessage: React.FC<AlertMessageProps> = ({
  type,
  message,
  onClose
}) => {
  const isSuccess = type === 'success';
  const isError = type === 'error';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-4 rounded-xl flex items-start gap-3 border shadow-sm ${
        isSuccess
          ? 'bg-emerald-50/90 text-emerald-800 border-emerald-100'
          : isError
          ? 'bg-rose-50/90 text-rose-800 border-rose-100'
          : 'bg-indigo-50/90 text-indigo-800 border-indigo-100'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        ) : (
          <AlertCircle className="w-5 h-5 text-rose-500" />
        )}
      </div>
      <div className="flex-1 text-left">
        <p className="text-xs font-semibold leading-relaxed">
          {message}
        </p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};
