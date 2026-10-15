/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router';
import { SegmentedControl } from './PortalPrimitives';
import { APP_ROUTES } from '../constants/routes';

export type RegistryModuleTab = 'students' | 'staff_lecturers';

const REGISTRY_TABS: readonly RegistryModuleTab[] = ['students', 'staff_lecturers'];

// Students / Staff & Lecturers switcher, under each registry list heading.
// Each tab is its own page, so the browser's Back button moves between them.
export const RegistryModuleTabs: React.FC<{ active: RegistryModuleTab }> = ({ active }) => {
  const navigate = useNavigate();
  return (
    <SegmentedControl
      options={REGISTRY_TABS}
      value={active}
      onChange={tab => {
        if (tab !== active) navigate(tab === 'students' ? APP_ROUTES.registry : APP_ROUTES.registryStaff);
      }}
      labels={{ students: 'Students', staff_lecturers: 'Staff & Lecturers' }}
      className="w-fit"
    />
  );
};
