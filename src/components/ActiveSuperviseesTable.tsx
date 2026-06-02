/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface Supervisee {
  id: string;
  name: string;
  programme: string;
  status: string;
  topic: string;
}

interface ActiveSuperviseesTableProps {
  supervisees: Supervisee[];
}

export const ActiveSuperviseesTable: React.FC<ActiveSuperviseesTableProps> = ({ supervisees }) => {
  return (
    <div id="active-supervisees-section" className="space-y-2 text-left font-sans">
      {/* Group Title */}
      <h5 className="text-[10px] font-extrabold text-[#475569] uppercase tracking-wider">
        Active Supervisees
      </h5>

      {/* Styled Table Container */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
        <table className="data-table text-xs">
          <thead>
            <tr className="data-thead bg-[#f8fafc]">
              <th className="data-th text-left w-[140px] shrink-0">Student & ID</th>
              <th className="data-th text-left">Research Topic</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#efecf6]/10 divide-slate-100">
            {supervisees && supervisees.length > 0 ? (
              supervisees.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/40 transition-colors">
                  {/* Student profile and ID */}
                  <td className="data-td font-sans text-left align-top">
                    <div className="font-extrabold text-brand-navy">{student.name}</div>
                    <div className="font-mono text-[9px] font-black text-slate-400 mt-1 uppercase">
                      {student.id}
                    </div>
                  </td>

                  {/* Research Topic details */}
                  <td className="data-td text-left align-top leading-relaxed text-[#334155] font-medium text-slate-600">
                    {student.topic}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="py-8 text-center text-slate-400 font-medium">
                  No active supervisees allocated.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
