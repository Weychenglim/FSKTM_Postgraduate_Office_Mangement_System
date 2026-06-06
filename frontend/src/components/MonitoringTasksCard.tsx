/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Calendar, Sliders, CheckSquare, BarChart3, UploadCloud } from 'lucide-react';
import { StatusBadge, getStatusBadgeTone } from './PortalPrimitives';
import { getDashboardTasks } from '../services';

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

const defaultTasks: MonitoringTask[] = [
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

const iconForTask = (taskId: string) => {
  if (taskId.includes('upload')) return UploadCloud;
  if (taskId.includes('config')) return CheckSquare;
  if (taskId.includes('rubric')) return Sliders;
  if (taskId.includes('generate')) return Calendar;
  return BarChart3;
};

export const MonitoringTasksCard: React.FC<MonitoringTasksCardProps> = ({ onTaskClick }) => {
  const [tasks, setTasks] = useState<MonitoringTask[]>(defaultTasks);

  useEffect(() => {
    getDashboardTasks()
      .then((response) => {
        const apiTasks = response.tasks.map((task) => ({
          ...task,
          icon: iconForTask(task.id),
        }));
        const merged = [
          ...apiTasks,
          ...defaultTasks.filter((task) => !apiTasks.some((apiTask) => apiTask.id === task.id)),
        ];
        setTasks(merged);
      })
      .catch(() => {
        setTasks(defaultTasks);
      });
  }, []);

  return (
    <div
      id="monitoring-tasks-sidebar-card"
      className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm space-y-4 text-left font-sans"
    >
      <h4 className="text-[14px] font-black text-brand-navy tracking-tight">
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
              <div className="p-2 sm:p-2.5 bg-[#f1f5f9] rounded-xl text-brand-navy shrink-0">
                <IconComponent className="w-4 h-4 text-slate-600" />
              </div>
              <div className="space-y-0.5 text-left min-w-0">
                <span className="text-xs font-bold text-brand-navy block leading-snug">
                  {task.name}
                </span>
                <StatusBadge tone={getStatusBadgeTone(task.status)} className="px-2 py-0.5 text-[8px] rounded-md">
                  {task.statusText}
                </StatusBadge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
