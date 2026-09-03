import { Bell } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';

export default function Notifications() {
  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader eyebrow="Employee services" title="Notifications" description="Updates and actions related to your employee account" />
      <EmptyState icon={Bell} title="No notifications yet" description="Important updates will appear here when they are available." />
    </div>
  );
}
