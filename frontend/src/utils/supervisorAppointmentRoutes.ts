import { SupervisorRecord } from '../types';

export const supervisorRecordRouteKey = (record: SupervisorRecord): string =>
  String(record.appointmentId || record.studentId);

export const findSupervisorRecordByRouteKey = (
  records: SupervisorRecord[],
  routeKey?: string,
): SupervisorRecord | null => {
  if (!routeKey) return null;
  return records.find((record) =>
    String(record.appointmentId) === routeKey || record.studentId === routeKey
  ) ?? null;
};
