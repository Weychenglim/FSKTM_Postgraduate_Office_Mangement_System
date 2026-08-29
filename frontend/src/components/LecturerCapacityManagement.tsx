import { ArrowLeft } from 'lucide-react';
import { PageHeader, PortalButton } from './PortalPrimitives';

interface LecturerCapacityManagementProps {
  onBack: () => void;
}

export function LecturerCapacityManagement({ onBack }: LecturerCapacityManagementProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lecturer Capacity Management"
        subtitle="Configure semester-specific Supervisor and Panel capacity."
        actions={(
          <PortalButton variant="secondary" icon={ArrowLeft} onClick={onBack}>
            Back
          </PortalButton>
        )}
      />
      <div className="border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Select an academic semester to review its capacity policy.
      </div>
    </div>
  );
}
