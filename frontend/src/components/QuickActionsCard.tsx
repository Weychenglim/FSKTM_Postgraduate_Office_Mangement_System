/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CalendarRange, Sliders, ListRestart, FileSearch } from 'lucide-react';
import { PortalButton, PortalCard } from './PortalPrimitives';

interface QuickActionsProps {
  onConfigurePeriod: () => void;
  onManageRubrics: () => void;
  onGenerateTasks: () => void;
  onViewRecords: () => void;
}

export const QuickActionsCard: React.FC<QuickActionsProps> = ({
  onConfigurePeriod,
  onManageRubrics,
  onGenerateTasks,
  onViewRecords
}) => {
  return (
    <div className="w-full text-left">
      <PortalCard id="quick-actions-card" padding="lg">
        <h3 className="text-lg font-extrabold text-brand-navy tracking-tight mb-6">
          Quick Actions
        </h3>

        <div className="space-y-3.5">
          <PortalButton
            variant="primary"
            size="lg"
            fullWidth
            icon={CalendarRange}
            iconPosition="right"
            onClick={onConfigurePeriod}
            className="justify-between"
          >
            Configure Mark Entry Period
          </PortalButton>

          <PortalButton
            variant="soft"
            size="lg"
            fullWidth
            icon={Sliders}
            iconPosition="right"
            onClick={onManageRubrics}
            className="justify-between"
          >
            Manage Rubric Components
          </PortalButton>

          <PortalButton
            variant="soft"
            size="lg"
            fullWidth
            icon={ListRestart}
            iconPosition="right"
            onClick={onGenerateTasks}
            className="justify-between"
          >
            Generate Evaluation Tasks
          </PortalButton>

          <PortalButton
            variant="secondary"
            size="lg"
            fullWidth
            icon={FileSearch}
            iconPosition="right"
            onClick={onViewRecords}
            className="justify-between"
          >
            View Mark Records
          </PortalButton>
        </div>
      </PortalCard>
    </div>
  );
};
