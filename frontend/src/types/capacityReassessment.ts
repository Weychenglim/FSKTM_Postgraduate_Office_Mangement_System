export type CapacityRequestKind = 'SUPERVISOR' | 'CO_SUPERVISOR' | 'PANEL';
export interface CapacitySemester { id: number; label: string; lifecycleStatus: string }
export interface CapacityPolicy {
  semesterId: number | null; planId: number | null; planVersion: number | null; limit: number | null;
  activeLoad: number; reservedLoad: number; state: string; unavailableUntil: string | null;
}
export interface CapacityReassessment {
  id: number; kind: CapacityRequestKind; status: string; latestEventId: number | null;
  student: { id: number; name: string; matricNo: string; programme: string };
  candidate: { id: number; name: string };
  originalSemester: CapacitySemester | null; originalCapacity: CapacityPolicy | null; currentCapacity: CapacityPolicy | null;
  authorization: { id: number; targetSemester: CapacitySemester; reason: string; createdAt: string; state: 'ACTIVE' | 'STALE' | 'REVOKED' | 'CONSUMED' } | null;
  history: { id: number; action: string; actorName: string; actorRole: string; reason: string; createdAt: string; targetSemester: CapacitySemester | null; policy: CapacityPolicy | null }[];
  canAuthorize: boolean; canRevoke: boolean;
}
export interface CapacityReassessmentWorkspace { activeSemester: CapacitySemester | null; requests: CapacityReassessment[] }
export interface CapacityAuthorizationInput { reason: string; expectedStatus: string; expectedActiveSemesterId: number; expectedAuthorizationId: number | null; expectedEventId: number | null }
export interface CapacityRevocationInput { reason: string; expectedStatus: string; expectedAuthorizationId: number; expectedEventId: number | null }
