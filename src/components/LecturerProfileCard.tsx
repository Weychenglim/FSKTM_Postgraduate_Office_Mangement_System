/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LecturerProfileCardProps {
  lecturerId: string;
  lecturerName: string;
  department: string;
  email: string;
  availability: 'Available' | 'Near Limit' | 'Full Load';
}

export const LecturerProfileCard: React.FC<LecturerProfileCardProps> = ({
  lecturerId,
  lecturerName,
  department,
  email,
  availability,
}) => {
  // Map specific ID to a high-quality Unsplash headshot
  const getLecturerPhoto = (id: string): string => {
    const photoMap: Record<string, string> = {
      'LEC-001': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop',
      'LEC-002': 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop',
      'LEC-003': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      'LEC-004': 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?q=80&w=200&auto=format&fit=crop',
      'LEC-005': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
      'LEC-006': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
      'LEC-007': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
      'LEC-008': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
    };
    return photoMap[id] || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'Near Limit':
        return {
          bg: 'bg-[#fffbeb]',
          text: 'text-[#b45309]',
          border: 'border-[#fef3c7]',
          dot: 'bg-[#d97706]',
        };
      case 'Full Load':
      default:
        return {
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          dot: 'bg-rose-500',
        };
    }
  };

  const statusStyle = getStatusColor(availability);

  return (
    <div id={`lecturer-profile-card-${lecturerId}`} className="bg-white border border-[#e2e8f0] rounded-xl p-4 flex gap-4 text-left font-sans">
      {/* Lecturer Photo */}
      <div className="w-20 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-[#f1f5f9]">
        <img
          src={getLecturerPhoto(lecturerId)}
          alt={lecturerName}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Lecturer Details */}
      <div className="flex-1 space-y-3">
        {/* Top line with Name and Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-transparent pb-1">
          <h4 className="text-[14px] font-bold text-brand-navy leading-tight">
            {lecturerName}
          </h4>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
            {availability}
          </span>
         </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-[60px_1fr] gap-x-3 gap-y-1 text-xs">
          <span className="font-bold text-slate-500">ID</span>
          <span className="text-[#334155] font-semibold">{lecturerId}</span>

          <span className="font-bold text-slate-500">Dept.</span>
          <span className="text-[#334155] font-semibold">{department}</span>

          <span className="font-bold text-slate-500">Email</span>
          <span className="text-[#334155] font-semibold select-all break-all">{email}</span>
        </div>
      </div>
    </div>
  );
};
