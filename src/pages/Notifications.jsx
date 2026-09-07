import { Bell, CheckCheck, Circle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { SkeletonText } from '../components/ui/Skeleton';
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
  const unreadCount = items.filter((n) => !(n.read_at || n.readAt)).length;

  return (
    <PageShell className="d-flex flex-column gap-4">
      <SectionHeader
        eyebrow="Employee services"
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'Updates and actions related to your employee account'}
      />
      {isError && <ErrorState description="Couldn't load your notifications." onRetry={refetch} />}
      {isLoading && <div className="hz-self-service-list p-3"><SkeletonText lines={4} /></div>}
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
