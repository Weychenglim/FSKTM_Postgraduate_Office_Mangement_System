import { SupervisorRecord } from '../types';

export const supervisorRecordRouteKey = (record: SupervisorRecord): string =>
  record.appointmentId || record.studentId;

export const findSupervisorRecordByRouteKey = (
  records: SupervisorRecord[],
  routeKey?: string,
): SupervisorRecord | null => {
  if (!routeKey) return null;
  return records.find((record) =>
    record.appointmentId === routeKey || record.studentId === routeKey
  ) ?? null;
};
