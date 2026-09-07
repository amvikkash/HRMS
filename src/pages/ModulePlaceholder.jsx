import { Construction } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

export default function ModulePlaceholder({ title, phase }) {
  return (
    <div className="hz-card">
      <EmptyState
        icon={Construction}
        title={`${title} ships in ${phase}`}
        description="This module is on the Vettri HRMS roadmap and will be built against the Phase 0 foundation - same auth, RBAC, audit trail, and design system already in place."
      />
    </div>
  );
}
