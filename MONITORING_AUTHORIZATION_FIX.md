# Monitoring Authorization Fix - Complete Implementation

## Issue Summary
Employee accounts with `EMPLOYEE` role could access the Monitoring module at `/monitoring` even without the `MONITORING_VIEW` permission. This bypassed intended authorization and exposed monitoring features (device tracking, session monitoring, activity logs) to unauthorized users.

## Root Cause Analysis
The Monitoring section in `navConfig.js` was missing the `permission: 'MONITORING_VIEW'` attribute that guards access. Other restricted modules (Payroll, Reports, Recruitment) all have section-level permissions, but Monitoring did not.

**Impact:**
- Employees could navigate to `/monitoring` manually
- The Monitoring component would mount and execute API calls
- API calls to `/api/monitoring/*` endpoints would execute before backend 403 responses
- Security-in-depth layer was missing on the frontend

## Solution Implemented

### 1. Add Permission Guard to Monitoring Section
**File:** `src/components/layout/navConfig.js`

```javascript
{
  id: 'monitoring',
  label: 'Monitoring',
  collapsible: true,
  permission: 'MONITORING_VIEW',  // ← ADDED
  items: [
    { to: '/monitoring', icon: MonitorSmartphone, label: 'Live', end: true },
    { to: '/monitoring/devices', icon: MonitorSmartphone, label: 'Devices' },
    { to: '/monitoring/activity', icon: Clock, label: 'Activity' },
    { to: '/monitoring/reports', icon: FileBarChart, label: 'Reports' },
  ],
},
```

**Effect:**
- All Monitoring nav items inherit `permission: 'MONITORING_VIEW'`
- When flattened into NAV_INDEX, each item carries the permission requirement
- ProtectedRoute can now check this permission before rendering components

### 2. Enhanced AuthContext Debug Logging
**File:** `src/auth/AuthContext.jsx`

Added detailed debug logging to verify permission structure at runtime:

```javascript
// In login function
console.log('[AUTH DEBUG - Login Response]', {
  role: data.user?.role || data.user?.roles?.[0],
  roles: data.user?.roles,
  permissions: data.user?.permissions,
  hasMonitoringView: data.user?.permissions?.includes('MONITORING_VIEW'),
});

// In session restore function  
console.log('[AUTH DEBUG - Session Restore]', {
  role: me?.role || me?.roles?.[0],
  roles: me?.roles,
  permissions: me?.permissions,
  hasMonitoringView: me?.permissions?.includes('MONITORING_VIEW'),
});
```

**Why:** Helps verify that permissions are correctly loaded from backend during login/session restore.

### 3. Enhanced ProtectedRoute Permission Checking
**File:** `src/auth/ProtectedRoute.jsx`

Added comprehensive debug logging and fixed variable scope:

```javascript
export default function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated, isLoading, hasAnyRole, hasPermission } = useAuth();
  // ... rest of component
  
  console.log('[PERMISSION CHECK]', {
    pathname: location.pathname,
    matchedItem: matchedItem?.to,
    requiredPermission,
    requiredRole,
    userPermissions: user?.permissions,
    userRoles: user?.roles,
    hasPermission: requiredPermission ? hasPermission(requiredPermission) : 'N/A',
    hasRole: requiredRole ? !!user?.roles?.includes(requiredRole) : 'N/A',
  });

  if (requiredRole && !hasAnyRole([requiredRole])) {
    console.log('[BLOCKED - Missing Role]', requiredRole);
    return <AccessDenied />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    console.log('[BLOCKED - Missing Permission]', requiredPermission);
    return <AccessDenied />;
  }
```

**How it Works:**
1. User navigates to `/monitoring/*`
2. ProtectedRoute component renders for all authenticated routes
3. Matches pathname against NAV_INDEX entries (sorted by length, longest first)
4. Finds matching route entry with `permission: 'MONITORING_VIEW'`
5. Calls `hasPermission('MONITORING_VIEW')` which checks:
   - `user?.permissions?.includes('MONITORING_VIEW')`
6. If permission is missing → renders AccessDenied component immediately
7. If permission exists → renders the Outlet (Monitoring component)
8. Monitoring component hooks (useEffect, useQuery) ONLY execute after permission check passes

## Authorization Flow

```
User navigates to /monitoring
        ↓
ProtectedRoute component renders
        ↓
isAuthenticated check → PASS (already authenticated)
        ↓
Match route in NAV_INDEX → FOUND
        ↓
Extract permission: 'MONITORING_VIEW'
        ↓
Call hasPermission('MONITORING_VIEW')
        ↓
Check: user?.permissions?.includes('MONITORING_VIEW')
        ↓
    ├─ FALSE → Render AccessDenied component
    │           (Monitoring component never mounts)
    │           (No API calls executed)
    │
    └─ TRUE  → Render Outlet + Monitoring component
                (useEffect hooks execute)
                (API calls to /api/monitoring/* execute)
```

## Expected Behavior After Fix

### Employee WITHOUT `MONITORING_VIEW` Permission
```
Action: Navigate to http://localhost:5174/monitoring

Frontend:
✓ Monitoring sidebar item is hidden
✓ Manual URL navigation triggers ProtectedRoute
✓ hasPermission('MONITORING_VIEW') returns false
✓ AccessDenied component renders
✓ User sees: "You do not have access to this page"
✓ Button: "Back to dashboard"

Network:
✓ NO requests to /api/monitoring/devices
✓ NO requests to /api/monitoring/sessions
✓ NO requests to /api/monitoring/activity
✓ NO requests to /api/monitoring/reports
```

### Employee WITH `MONITORING_VIEW` Permission
```
Action: Navigate to http://localhost:5174/monitoring

Frontend:
✓ Monitoring sidebar item appears
✓ Navigation works normally
✓ hasPermission('MONITORING_VIEW') returns true
✓ MonitoringDashboard component mounts
✓ All UI renders normally

Network:
✓ GET /api/monitoring/devices (succeeds)
✓ GET /api/monitoring/sessions?from=...&to=... (succeeds)
✓ Other monitoring API calls execute normally
✓ Backend returns 200 OK responses
```

### Admin/Super Admin WITH `MONITORING_VIEW` Permission
```
Action: Navigate to http://localhost:5174/monitoring

Frontend:
✓ Monitoring sidebar item appears
✓ All monitoring routes accessible
✓ All sub-pages work normally

Network:
✓ All API calls succeed
✓ Full monitoring functionality available
```

## Files Modified

1. **src/components/layout/navConfig.js**
   - Added `permission: 'MONITORING_VIEW'` to Monitoring section
   - Ensures all monitoring items inherit the permission requirement

2. **src/auth/AuthContext.jsx**
   - Added debug logging to `login()` function
   - Added debug logging to session restore in `useEffect`
   - Helps verify permission structure matches backend response

3. **src/auth/ProtectedRoute.jsx**
   - Added `user` to destructured context (was missing)
   - Added comprehensive debug logging to permission checks
   - Logs matched nav item, required permission, user permissions, and decision

## How to Verify the Fix

### Browser Console Testing
1. Open browser DevTools (F12)
2. Go to Console tab
3. Log in as Employee
4. Look for `[AUTH DEBUG - Login Response]` message
5. Verify `permissions` array and `hasMonitoringView` value
6. Navigate to `/monitoring`
7. Look for `[PERMISSION CHECK]` and `[BLOCKED - Missing Permission]` messages
8. Verify no `/api/monitoring/**` requests in Network tab

### Network Tab Testing
1. Open browser DevTools
2. Go to Network tab
3. Clear previous requests
4. As Employee: Try to navigate to `/monitoring`
5. Verify:
   - ✓ No requests to `/api/monitoring/devices`
   - ✓ No requests to `/api/monitoring/sessions`
   - ✓ AccessDenied page renders instead

### Testing Across Roles
- **Employee role** (no MONITORING_VIEW) → Cannot access
- **Manager role** (check if has MONITORING_VIEW) → Access based on permission
- **HR role** (check if has MONITORING_VIEW) → Access based on permission
- **Admin role** (likely has MONITORING_VIEW) → Can access
- **Super Admin** (has all permissions) → Can access

## Architecture Notes

### Permission Inheritance
The NAV_INDEX flattening ensures that:
```javascript
export const NAV_INDEX = NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ 
    ...item, 
    section: section.label, 
    permission: item.permission || section.permission  // ← Inherits section permission
  }))
);
```

Each Monitoring item now has `permission: 'MONITORING_VIEW'` either:
- From the item itself (if item has explicit permission)
- From the section (if item inherits section permission)

### Security Layers
1. **Frontend Permission Guard** (NEW)
   - ProtectedRoute blocks before component mounts
   - Prevents unauthorized UI rendering
   - Prevents unauthorized API requests

2. **Backend Authorization** (EXISTING)
   - All `/api/monitoring/*` endpoints protected
   - Returns 403 Forbidden for unauthorized requests
   - Server-side permission check (authoritative)

Both layers work together for defense-in-depth security.

## Build Status
✅ Build successful (6.45s)
- No compilation errors
- All 1798 modules transformed
- Output: `dist/` directory
- Only Sass deprecation warnings (non-breaking)

## Testing Instructions for QA

### Test Case 1: Employee Without Permission
1. Log in with EMPLOYEE account
2. Verify Monitoring section not in sidebar
3. Try direct URL: `http://localhost:5174/monitoring`
4. Expected: Access Restricted page
5. Check Network tab: Zero `/api/monitoring/` requests
6. Click "Back to dashboard" button works

### Test Case 2: Admin With Permission  
1. Log in with ADMIN account
2. Verify Monitoring section visible in sidebar
3. Click Monitoring → Live
4. Expected: MonitoringDashboard loads normally
5. Check Network tab: Requests to `/api/monitoring/devices` and `/api/monitoring/sessions`
6. Verify all monitoring features work

### Test Case 3: All Monitoring Sub-Routes
1. As Admin with MONITORING_VIEW:
   - `/monitoring` → MonitoringDashboard ✓
   - `/monitoring/live` → MonitoringDashboard ✓
   - `/monitoring/devices` → Device list ✓
   - `/monitoring/devices/:id` → Device details ✓
   - `/monitoring/activity` → Activity log ✓
   - `/monitoring/reports` → Reports ✓

2. As Employee without MONITORING_VIEW:
   - Each route → Access Restricted ✓

### Test Case 4: Permission Change
1. Log in as Employee
2. Try `/monitoring` → Access Restricted
3. (Backend: Assign MONITORING_VIEW permission)
4. Refresh page
5. Expected: Monitoring dashboard loads (after fresh session restore)

## Debug Console Messages

When testing, you should see messages like:

```javascript
// At login
[AUTH DEBUG - Login Response] {
  role: "EMPLOYEE",
  roles: ["EMPLOYEE"],
  permissions: [],
  hasMonitoringView: false
}

// At session restore
[AUTH DEBUG - Session Restore] {
  role: "EMPLOYEE", 
  roles: ["EMPLOYEE"],
  permissions: [],
  hasMonitoringView: false
}

// When accessing /monitoring
[PERMISSION CHECK] {
  pathname: "/monitoring",
  matchedItem: "/monitoring",
  requiredPermission: "MONITORING_VIEW",
  requiredRole: undefined,
  userPermissions: [],
  userRoles: ["EMPLOYEE"],
  hasPermission: false,
  hasRole: "N/A"
}

[BLOCKED - Missing Permission] "MONITORING_VIEW"
```

## Summary

✅ **Root Cause:** Monitoring section missing `permission: 'MONITORING_VIEW'`

✅ **Fix Applied:** Added permission guard to section definition

✅ **How It Works:** ProtectedRoute now checks permission before component mounts

✅ **Result:** 
- Employees without permission cannot access Monitoring
- No unauthorized API calls execute
- Frontend + Backend authorization aligned
- Defense-in-depth security implemented

✅ **Build:** Successful, no errors

✅ **Ready for:** QA/Integration Testing with real backend instance
