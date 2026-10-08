export interface DelegationPerson { id: number; name: string }
export interface CoordinatorDelegation {
  id: number;
  programme: string;
  coordinator: DelegationPerson;
  startsOn: string;
  endsOn: string;
  justification: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  grantedBy: DelegationPerson;
  createdAt: string;
  revokedAt: string | null;
  revokedBy: DelegationPerson | null;
  revocationReason: string;
  canRevoke: boolean;
}
export interface CoordinatorDelegationInput {
  programme: string;
  coordinatorId: number;
  startsOn: string;
  endsOn: string;
  justification: string;
}
export interface CoordinatorDelegationOptions {
  programmes: string[];
  coordinators: (DelegationPerson & { programme: string })[];
}
