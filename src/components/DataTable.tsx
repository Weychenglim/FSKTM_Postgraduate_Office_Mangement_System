/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StatusChip } from './StatusChip';
import { PortalButton } from './PortalPrimitives';

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
      <table className="data-table min-w-[720px]">
        <thead>
          <tr className="data-thead">
            <th className="data-th first:pl-6">Semester</th>
            <th className="data-th">Evaluation Stage</th>
            <th className="data-th">Start Date</th>
            <th className="data-th">End Date</th>
            <th className="data-th">Deadline</th>
            <th className="data-th text-center">Status</th>
            <th className="data-th last:pr-6 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              className="data-row group"
            >
              <td className="data-td-strong first:pl-6 tracking-tight">
                {row.semester}
              </td>
              <td className="data-td">
                {row.evaluationStage}
              </td>
              <td className="data-td">
                {row.startDate}
              </td>
              <td className="data-td">
                {row.endDate}
              </td>
              <td className="data-td">
                {row.deadline}
              </td>
              <td className="data-td text-center">
                <StatusChip status={row.status} />
              </td>
              <td className="data-td last:pr-6 text-right">
                {row.status.toLowerCase() === 'active' ? (
                  <PortalButton
                    onClick={() => onEdit(row)}
                    variant="soft"
                    size="sm"
                  >
                    Edit
                  </PortalButton>
                ) : (
                  <PortalButton
                    onClick={() => onView(row)}
                    variant="secondary"
                    size="sm"
                  >
                    View
                  </PortalButton>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
