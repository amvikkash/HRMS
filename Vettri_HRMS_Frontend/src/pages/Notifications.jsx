import { Bell, CheckCheck, Circle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import EmptyState from '../components/ui/EmptyState';
import PageShell from '../components/ui/PageShell';
import SectionHeader from '../components/ui/SectionHeader';
import { selfServiceApi } from '../api/endpoints/selfService';
import { useAuth } from '../hooks/useAuth';

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: notifications, isLoading, isError, refetch } = useQuery({ queryKey: ['notifications'], queryFn: selfServiceApi.notifications, enabled: !!user });
  const markRead = useMutation({
    mutationFn: selfServiceApi.markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const items = Array.isArray(notifications) ? notifications : [];

  return (
    <PageShell className="d-flex flex-column gap-4">
      <SectionHeader eyebrow="Employee services" title="Notifications" description="Updates and actions related to your employee account" />
      {isError && <div className="hz-inline-error" role="alert">Could not load notifications. <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={refetch}>Try again</button></div>}
      {isLoading && <div className="hz-self-service-list"><div className="hz-self-service-list__row">Loading your notifications...</div></div>}
      {!isLoading && !isError && items.length === 0 && <EmptyState icon={Bell} title="You&apos;re all caught up" description="Important updates will appear here when they are available." />}
      {!isLoading && !isError && items.length > 0 && <div className="hz-self-service-list" aria-label="Notifications">
        {items.map((notification) => <button type="button" className={`hz-self-service-list__row hz-notification-row ${notification.read_at || notification.readAt ? '' : 'is-unread'}`} key={notification.id} onClick={() => !(notification.read_at || notification.readAt) && markRead.mutate(notification.id)}>
          <span className="hz-self-service-list__icon"><Bell size={17} /></span>
          <span><strong>{notification.title}</strong><small>{notification.message}</small></span>
          {notification.read_at || notification.readAt ? <CheckCheck size={16} aria-label="Read" /> : <Circle size={10} aria-label="Unread" />}
        </button>)}
      </div>}
    </PageShell>
  );
}
