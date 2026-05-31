/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RightDrawerProps {
  id?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const RightDrawer: React.FC<RightDrawerProps> = ({
  id = 'right-drawer-overlay',
  isOpen,
  onClose,
  title,
  children,
}) => {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div id={id} className="fixed inset-0 z-50 flex justify-end">
          {/* Dimmed Background Overlay */}
          <motion.div
            id="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-navy backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />

          {/* Drawer Body panel */}
          <motion.div
            id="drawer-body"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-full max-w-lg md:max-w-xl h-full bg-white shadow-sm flex flex-col z-10 border-l border-slate-100"
          >
            {/* Drawer Header */}
            <div id="drawer-header" className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-brand-navy text-[15px] tracking-tight font-sans">
                {title}
              </h3>
              <button
                id="drawer-close-btn"
                onClick={onClose}
                className="w-10 h-10 hover:bg-slate-50 border border-slate-205 rounded-xl flex items-center justify-center transition-colors text-slate-400 hover:text-brand-navy"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div id="drawer-content" className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
