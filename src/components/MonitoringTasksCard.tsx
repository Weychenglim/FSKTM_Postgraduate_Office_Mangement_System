/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, Sliders, CheckSquare, BarChart3, UploadCloud } from 'lucide-react';

interface MonitoringTask {
  id: string;
  name: string;
  status: string;
  statusText: string;
  icon: any;
}

interface MonitoringTasksCardProps {
  onTaskClick?: (taskId: string) => void;
}

export const MonitoringTasksCard: React.FC<MonitoringTasksCardProps> = ({ onTaskClick }) => {
  const tasks: MonitoringTask[] = [
    {
      id: 'task_upload',
      name: 'Upload semester timeline',
      status: 'critical',
      statusText: 'Due in 2 days',
      icon: UploadCloud,
    },
    {
      id: 'task_config',
      name: 'Configure mark entry period',
      status: 'completed',
      statusText: 'Completed',
      icon: CheckSquare,
    },
    {
      id: 'task_rubric',
      name: 'Define rubric components',
      status: 'active',
      statusText: 'Ongoing',
      icon: Sliders,
    },
    {
      id: 'task_generate',
      name: 'Generate evaluation tasks',
      status: 'scheduled',
      statusText: 'Scheduled',
      icon: Calendar,
    },
    {
      id: 'task_monitor',
      name: 'Monitor mark submission status',
      status: 'active',
      statusText: 'Active',
      icon: BarChart3,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-600 font-extrabold';
      case 'completed':
        return 'text-slate-400 font-medium';
      case 'active':
        return 'text-[#1e3a8a] font-bold';
      default:
        return 'text-slate-500 font-bold';
    }
  };

  return (
    <div
      id="monitoring-tasks-sidebar-card"
      className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm space-y-4 text-left font-sans"
    >
      <h4 className="text-[14px] font-black text-[#0c1424] tracking-tight">
        Office Monitoring Tasks
      </h4>

      <div className="divide-y divide-[#efecf6]/10 divide-slate-100 flex flex-col pt-1">
        {tasks.map((task) => {
          const IconComponent = task.icon;
          return (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task.id)}
              className="py-4 flex items-start gap-4 transition-all hover:bg-slate-50/50 px-2 rounded-xl cursor-pointer"
            >
              <div className="p-2 sm:p-2.5 bg-[#f1f5f9] rounded-xl text-[#0c1424] shrink-0">
                <IconComponent className="w-4 h-4 text-slate-600" />
              </div>
              <div className="space-y-0.5 text-left min-w-0">
                <span className="text-xs font-bold text-[#0c1424] block leading-snug">
                  {task.name}
                </span>
                <span className={`text-[10px] block ${getStatusColor(task.status)}`}>
                  {task.statusText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
