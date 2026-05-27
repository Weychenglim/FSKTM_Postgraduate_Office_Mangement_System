/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StatusChip } from './StatusChip';

export interface TableRow {
  id: string;
  semester: string;
  evaluationStage: string;
  startDate: string;
  endDate: string;
  deadline: string;
  status: string;
}

interface DataTableProps {
  data: TableRow[];
  onEdit: (row: TableRow) => void;
  onView: (row: TableRow) => void;
}

export const DataTable: React.FC<DataTableProps> = ({ data, onEdit, onView }) => {
  return (
    <div id="data-table-container" className="w-full overflow-x-auto">
      <table className="w-full min-w-[720px] text-left border-collapse font-sans">
        <thead>
          <tr className="border-b border-slate-200/90 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
            <th className="py-4.5 px-4 first:pl-6">Semester</th>
            <th className="py-4.5 px-4">Evaluation Stage</th>
            <th className="py-4.5 px-4">Start Date</th>
            <th className="py-4.5 px-4">End Date</th>
            <th className="py-4.5 px-4">Deadline</th>
            <th className="py-4.5 px-4 text-center">Status</th>
            <th className="py-4.5 px-4 last:pr-6 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row) => (
            <tr 
              key={row.id} 
              className="hover:bg-slate-50/50 transition-colors group"
            >
              <td className="py-4.5 px-4 first:pl-6 text-xs text-slate-800 font-bold tracking-tight">
                {row.semester}
              </td>
              <td className="py-4.5 px-4 text-xs text-slate-500 font-semibold">
                {row.evaluationStage}
              </td>
              <td className="py-4.5 px-4 text-xs text-slate-500 font-semibold">
                {row.startDate}
              </td>
              <td className="py-4.5 px-4 text-xs text-slate-500 font-semibold">
                {row.endDate}
              </td>
              <td className="py-4.5 px-4 text-xs text-slate-500 font-semibold">
                {row.deadline}
              </td>
              <td className="py-4.5 px-4 text-center">
                <StatusChip status={row.status} />
              </td>
              <td className="py-4.5 px-4 last:pr-6 text-right">
                {row.status.toLowerCase() === 'active' ? (
                  <button
                    onClick={() => onEdit(row)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer select-none"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={() => onView(row)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer select-none"
                  >
                    View
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
