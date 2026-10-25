/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { MarksSummaryCard } from './MarksPrimitives';

interface SummaryCardProps {
  title: string;
  badgeText: string;
  subtext: string;
  icon?: LucideIcon;
  onClick?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, badgeText, subtext, icon, onClick }) => (
  <MarksSummaryCard title={title} value={badgeText} description={subtext} icon={icon} onClick={onClick} />
);
