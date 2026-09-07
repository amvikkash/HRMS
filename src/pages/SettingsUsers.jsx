import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, ShieldCheck, ShieldPlus, Trash2, Lock } from 'lucide-react';
import { usersApi } from '../api/endpoints/users';
import { rolesApi, permissionsApi } from '../api/endpoints/roles';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Dialog from '../components/ui/Dialog';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FormField from '../components/ui/FormField';
import Tabs from '../components/ui/Tabs';
import { SkeletonText } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import PageHeader from '../components/ui/PageHeader';
import ErrorBanner from '../components/ui/ErrorBanner';

export default function SettingsUsers() {
  const [tab, setTab] = useState('users');

  return (
    <div className="hz-admin-page hz-admin-page--users hz-settings-page d-flex flex-column gap-4">
      <PageHeader
        eyebrow="Settings"
        title="Users & Roles"
        description="Manage who can sign in to Vettri HRMS and what they're allowed to do"
      />

      <Tabs
        value={tab}
        onChange={setTab}
        ariaLabel="Users and roles sections"
        items={[
          { key: 'users', label: 'Users' },
          { key: 'roles', label: 'Roles & Permissions' },
        ]}
      />

      {tab === 'users' ? <UsersPanel /> : <RolesPanel />}
    </div>
  );
}

function UsersPanel() {
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
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-end">
        <Button icon={UserPlus} onClick={() => setShowCreate(true)}>New User</Button>
      </div>

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

function RolesPanel() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingPermissionsFor, setEditingPermissionsFor] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: roles, isLoading, isError, refetch } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });

  const deleteRole = useMutation({
    mutationFn: (id) => rolesApi.remove(id),
    onSuccess: () => {
      toast.success(`Deleted role "${deletingRole?.name}".`);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeletingRole(null);
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not delete this role - it may still be assigned to users.'),
  });

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-between align-items-center">
        <p className="mb-0" style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
          Roles bundle permissions together. Build a custom role for a team that needs an access pattern the built-in roles don't cover.
        </p>
        <Button icon={ShieldPlus} onClick={() => setShowCreate(true)}>New Role</Button>
      </div>

      <Card bodyClassName="p-0">
        {isLoading && (
          <div className="p-4">
            <SkeletonText lines={5} />
          </div>
        )}

        {isError && <ErrorState description="Couldn't load roles - you may not have permission, or the server is unreachable." onRetry={refetch} />}

        {!isLoading && !isError && roles?.length === 0 && (
          <EmptyState title="No roles yet" description="Create a role to start assigning tailored permission sets to users." />
        )}

        {!isLoading && !isError && roles?.length > 0 && (
          <div className="table-responsive">
            <table className="table mb-0 align-middle hz-table" aria-label="Roles">
              <thead>
                <tr style={{ fontSize: 'var(--hz-text-xs)', color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>
                  <th className="ps-4">Role</th>
                  <th>Permissions</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center gap-2">
                        <div style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)' }}>{r.name}</div>
                        {r.systemDefined && (
                          <Badge variant="neutral" title="Built-in role - permissions are fixed by the platform">
                            <Lock size={11} className="me-1" style={{ verticalAlign: -1 }} />System
                          </Badge>
                        )}
                      </div>
                      {r.description && <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{r.description}</div>}
                    </td>
                    <td>
                      <StatusBadge status={r.permissions?.length ? 'ACTIVE' : 'INACTIVE'} variant={r.permissions?.length ? 'primary' : 'neutral'}>
                        {r.permissions?.length || 0} permission{r.permissions?.length === 1 ? '' : 's'}
                      </StatusBadge>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-2">
                        <Button variant="secondary" size="sm" icon={ShieldCheck} onClick={() => setEditingPermissionsFor(r)}>
                          {r.systemDefined ? 'View Permissions' : 'Edit Permissions'}
                        </Button>
                        {!r.systemDefined && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Trash2}
                            onClick={() => setDeletingRole(r)}
                            aria-label={`Delete role "${r.name}"`}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreate && <CreateRoleModal onClose={() => setShowCreate(false)} />}
      {editingPermissionsFor && (
        <EditPermissionsModal role={editingPermissionsFor} onClose={() => setEditingPermissionsFor(null)} />
      )}
      <ConfirmDialog
        open={!!deletingRole}
        onClose={() => setDeletingRole(null)}
        onConfirm={() => deleteRole.mutate(deletingRole.id)}
        title={`Delete "${deletingRole?.name}"?`}
        description="Users currently holding only this role will lose the permissions it grants. This can't be undone."
        confirmLabel="Delete Role"
        loading={deleteRole.isPending}
      />
    </div>
  );
}

function PermissionMatrix({ permissions, selected, onToggle, readOnly }) {
  const grouped = (permissions || []).reduce((acc, p) => {
    const module = p.module || 'General';
    (acc[module] ||= []).push(p);
    return acc;
  }, {});
  const moduleNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <div className="hz-permission-matrix">
      {moduleNames.map((module) => (
        <div className="hz-permission-matrix__group" key={module}>
          <h4>{module}</h4>
          <div className="hz-permission-matrix__grid">
            {grouped[module].map((permission) => (
              <label key={permission.id} className={`hz-permission-matrix__item ${readOnly ? 'is-readonly' : ''}`}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={selected.has(permission.code)}
                  disabled={readOnly}
                  onChange={() => onToggle(permission.code)}
                />
                <span>
                  <span className="hz-permission-matrix__code">{permission.code}</span>
                  {permission.description && <span className="hz-permission-matrix__desc">{permission.description}</span>}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditPermissionsModal({ role, onClose }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selected, setSelected] = useState(() => new Set((role.permissions || []).map((p) => p.code)));
  const readOnly = role.systemDefined;

  const { data: permissions, isLoading, isError } = useQuery({ queryKey: ['permissions'], queryFn: permissionsApi.list });

  const save = useMutation({
    mutationFn: () => rolesApi.updatePermissions(role.id, Array.from(selected)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(`Updated permissions for ${role.name}.`);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not update permissions.'),
  });

  function toggle(code) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={readOnly ? `${role.name} permissions` : `Edit permissions - ${role.name}`}
      description={readOnly ? 'This is a built-in role - its permissions are fixed by the platform.' : 'Choose exactly what this role can see and do.'}
      size="xl"
      footer={!readOnly && (
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save Permissions</Button>
        </>
      )}
    >
      {isLoading && <SkeletonText lines={6} />}
      {isError && <ErrorState description="Couldn't load the permission list." />}
      {!isLoading && !isError && (
        <PermissionMatrix permissions={permissions} selected={selected} onToggle={toggle} readOnly={readOnly} />
      )}
    </Dialog>
  );
}

function CreateRoleModal({ onClose }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', description: '' });
  const [selected, setSelected] = useState(() => new Set());
  const [error, setError] = useState(null);

  const { data: permissions, isLoading, isError } = useQuery({ queryKey: ['permissions'], queryFn: permissionsApi.list });

  const createRole = useMutation({
    mutationFn: () => rolesApi.create({ name: form.name, description: form.description, permissionCodes: Array.from(selected) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(`Created role "${form.name}".`);
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not create this role.'),
  });

  function toggle(code) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    createRole.mutate();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="New Role"
      description="Name the role, then choose the permissions it grants."
      size="xl"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={createRole.isPending}>Cancel</Button>
          <Button onClick={handleSubmit} loading={createRole.isPending} disabled={!form.name.trim()}>Create Role</Button>
        </>
      )}
    >
      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <FormField label="Role Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required placeholder="e.g. Regional Recruiter" />
        <FormField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="What this role is for" />
        {isLoading && <SkeletonText lines={5} />}
        {isError && <ErrorState description="Couldn't load the permission list." />}
        {!isLoading && !isError && (
          <PermissionMatrix permissions={permissions} selected={selected} onToggle={toggle} />
        )}
      </form>
    </Dialog>
  );
}
