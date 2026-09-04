import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, ShieldCheck } from 'lucide-react';
import { usersApi } from '../api/endpoints/users';
import { rolesApi } from '../api/endpoints/roles';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Dialog from '../components/ui/Dialog';
import FormField from '../components/ui/FormField';
import { SkeletonText } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import PageHeader from '../components/ui/PageHeader';
import ErrorBanner from '../components/ui/ErrorBanner';

export default function SettingsUsers() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingRolesFor, setEditingRolesFor] = useState(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }) => (active ? usersApi.deactivate(id) : usersApi.activate(id)),
    onSuccess: () => {
      toast.success('User status updated.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not update user status.'),
  });

  return (
    <div className="hz-settings-page d-flex flex-column gap-4">
      <PageHeader
        eyebrow="Settings"
        title="Users & Roles"
        description="Manage who can sign in to Vettri HRMS and what they're allowed to do"
        actions={<Button icon={UserPlus} onClick={() => setShowCreate(true)}>New User</Button>}
      />

      <Card bodyClassName="p-0">
        {isLoading && (
          <div className="p-4">
            <SkeletonText lines={5} />
          </div>
        )}

        {isError && <ErrorState description="Couldn't load users - you may not have permission, or the server is unreachable." onRetry={refetch} />}

        {!isLoading && !isError && users?.length === 0 && (
          <EmptyState title="No users yet" description="Create the first account to get your team into Vettri HRMS." />
        )}

        {!isLoading && !isError && users?.length > 0 && (
          <div className="table-responsive">
            <table className="table mb-0 align-middle hz-table" aria-label="Users and roles">
            <thead>
              <tr style={{ fontSize: 'var(--hz-text-xs)', color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>
                <th className="ps-4">User</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Last Login</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center gap-2">
                      <Avatar name={u.fullName} size="sm" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)' }}>{u.fullName}</div>
                        <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex gap-1 flex-wrap">
                      {u.roles.map((r) => (
                        <Badge key={r} variant="primary">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={u.active ? 'ACTIVE' : 'INACTIVE'} variant={u.active ? 'success' : 'neutral'} dot>
                      {u.active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </td>
                  <td style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="text-end pe-4">
                    <div className="d-flex justify-content-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={ShieldCheck}
                        onClick={() => setEditingRolesFor(u)}
                      >
                        Edit Roles
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={toggleActive.isPending && toggleActive.variables?.id === u.id}
                        onClick={() => toggleActive.mutate({ id: u.id, active: u.active })}
                      >
                        {u.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {editingRolesFor && (
        <EditRolesModal
          user={editingRolesFor}
          onClose={() => setEditingRolesFor(null)}
          otherSuperAdminCount={(users || []).filter((u) => u.id !== editingRolesFor.id && u.active && u.roles.includes('SUPER_ADMIN')).length}
        />
      )}
    </div>
  );
}

function EditRolesModal({ user, onClose, otherSuperAdminCount }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selected, setSelected] = useState(() => new Set(user.roles));

  const { data: roles, isLoading, isError } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });

  // No backend guard exists against this (UserService#assignRoles is an
  // unconditional overwrite) - without this check, removing SUPER_ADMIN
  // from the last account that has it locks every admin screen in the
  // app with no recovery path except direct database access. Computed
  // from the already-loaded user list on the parent page rather than a
  // new endpoint, since it's just a count over data that's already there.
  const wouldRemoveLastSuperAdmin = user.roles.includes('SUPER_ADMIN') && !selected.has('SUPER_ADMIN') && otherSuperAdminCount === 0;

  const save = useMutation({
    mutationFn: () => usersApi.assignRoles(user.id, Array.from(selected)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Updated roles for ${user.fullName}`);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not update roles.'),
  });

  function toggle(name) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <Dialog open onClose={onClose} title="Edit Roles" description={user.fullName} size="sm">
      {isLoading && <SkeletonText lines={4} />}
      {isError && <ErrorState description="Couldn't load roles." />}
      {!isLoading && !isError && (
        <>
          <div className="d-flex flex-column gap-2 mb-3">
            {roles?.map((r) => (
              <label
                key={r.id}
                className="d-flex align-items-start gap-2 p-2 rounded-3"
                style={{ border: '1px solid var(--hz-border)', cursor: 'pointer' }}
              >
                <input type="checkbox" className="form-check-input mt-1" checked={selected.has(r.name)} onChange={() => toggle(r.name)} />
                <span>
                  <span className="d-block" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600 }}>
                    {r.name}
                  </span>
                  {r.description && (
                    <span className="d-block" style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>
                      {r.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {wouldRemoveLastSuperAdmin && (
            <p style={{ fontSize: 12, color: 'var(--hz-danger-600)', fontWeight: 600 }}>
              {user.fullName} is the only remaining Super Admin. Removing this role would leave no one able to manage users, roles, or settings - assign Super Admin to someone else first.
            </p>
          )}
          {!wouldRemoveLastSuperAdmin && selected.size === 0 && (
            <p style={{ fontSize: 12, color: 'var(--hz-warning-600)' }}>
              This user will have no roles at all - they'll be able to log in but won't be able to do anything until a role is assigned.
            </p>
          )}
          <div className="d-flex justify-content-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={wouldRemoveLastSuperAdmin}>
              Save Roles
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}

function CreateUserModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ username: '', email: '', fullName: '', temporaryPassword: '' });
  const [error, setError] = useState(null);

  const createUser = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not create user'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    createUser.mutate(form);
  }

  return (
    <Dialog open onClose={onClose} title="New User" size="sm">
      <form onSubmit={handleSubmit}>
        {error && (
          <ErrorBanner>{error}</ErrorBanner>
        )}
        <FormField label="Full Name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} required />
        <FormField label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required />
        <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
        <FormField
          label="Temporary Password"
          type="password"
          value={form.temporaryPassword}
          onChange={(v) => setForm({ ...form, temporaryPassword: v })}
          required
        />
        <p style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>
          The new user will be prompted to change this password on first login. New accounts default to the Employee role.
        </p>
        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createUser.isPending}>
            Create User
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
