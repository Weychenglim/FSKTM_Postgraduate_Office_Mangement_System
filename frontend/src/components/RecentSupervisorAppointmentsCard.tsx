/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AppointmentRecord {
  studentName: string;
  date: string;
  status: string;
}

interface RecentSupervisorAppointmentsCardProps {
  appointments: AppointmentRecord[];
}

export const RecentSupervisorAppointmentsCard: React.FC<RecentSupervisorAppointmentsCardProps> = ({
  appointments,
}) => {
  return (
    <div id="recent-appointments-section" className="space-y-2 text-left font-sans">
      {/* Group Title label */}
      <h5 className="section-label text-[#475569]">
        Recent Supervisor Appointments
      </h5>

      {/* Appointment Cards Stack */}
      <div className="space-y-2.5">
        {appointments && appointments.length > 0 ? (
          appointments.map((apt, index) => (
            <div
              key={`${apt.studentName}-${index}`}
              className="bg-white border border-[#e2e8f0] rounded-xl p-3.5 flex items-center justify-between gap-4 transition-all hover:border-slate-300"
            >
              {/* Left Details */}
              <div className="space-y-1 text-left">
                <span className="card-value text-brand-navy block">
                  {apt.studentName}
                </span>
                <span className="card-caption text-slate-400 block">
                  {apt.date}
                </span>
              </div>

              {/* Status Badge */}
              <span className="inline-flex items-center px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 text-[8px] font-black uppercase tracking-wider">
                {apt.status}
              </span>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-slate-400 font-medium bg-slate-50 rounded-xl border border-[#e2e8f0] text-xs">
            No recent appointments found.
          </div>
        )}
      </div>
    </div>
  );
};
