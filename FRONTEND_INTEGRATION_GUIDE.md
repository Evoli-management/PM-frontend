# Frontend Integration Guide - Team Management Features

## Overview

The backend has deployed new team management endpoints that enable:
1. **Team Join Request Flow** - Members request to join teams, team leads approve/reject
2. **Admin Handoff** - Promote members to admin before leaving organization
3. **Team Settings** - Team leads can update team name and description

---

## New Files Created

### Services
- **`src/services/teamsService.js`** - Updated with 5 new methods for join requests
- **`src/services/organizationService.js`** - Updated with 2 new methods for admin management

### Hooks
- **`src/hooks/useTeamJoinRequests.js`** - React hook for managing join requests
- **`src/hooks/useAdminHandoff.js`** - React hook for admin role management

### Components
- **`src/components/teams/JoinTeamRequest.jsx`** - Form for requesting to join team
- **`src/components/teams/PendingJoinRequests.jsx`** - Team lead view for pending requests
- **`src/components/teams/AdminRoleManager.jsx`** - Manage member roles (promote/demote admin)
- **`src/components/teams/AdminHandoffDialog.jsx`** - Dialog for leaving organization (admin only)

### Styles
- **`src/components/teams/JoinTeamRequest.module.css`**
- **`src/components/teams/PendingJoinRequests.module.css`**
- **`src/components/teams/AdminRoleManager.module.css`**
- **`src/components/teams/AdminHandoffDialog.module.css`**

---

## API Methods Available

### Team Join Requests

#### Request to Join Team
```javascript
import teamsService from '@/services/teamsService';

// Request to join a team
const result = await teamsService.requestJoinTeam(teamId, 'Optional message');
```

**Parameters:**
- `teamId` (string): Team UUID
- `message` (string, optional): Message to team lead

**Response:**
```javascript
{
  id: 'uuid',
  teamId: 'uuid',
  userId: 'uuid',
  status: 'pending',
  message: 'Optional message',
  createdAt: '2026-01-03T...',
  requestedAt: '2026-01-03T...'
}
```

#### Get Pending Requests (Team Lead/Admin Only)
```javascript
const requests = await teamsService.getTeamJoinRequests(teamId);
```

**Parameters:**
- `teamId` (string): Team UUID

**Response:**
```javascript
[
  {
    id: 'uuid',
    teamId: 'uuid',
    userId: 'uuid',
    userFirstName: 'John',
    userLastName: 'Doe',
    userEmail: 'john@example.com',
    status: 'pending',
    message: 'I would like to join',
    createdAt: '2026-01-03T...'
  }
]
```

#### Review Request (Approve/Reject)
```javascript
// Approve request
const result = await teamsService.reviewJoinRequest(teamId, requestId, 'approved');

// Reject with reason
const result = await teamsService.reviewJoinRequest(teamId, requestId, 'rejected', 'Team at capacity');
```

**Parameters:**
- `teamId` (string): Team UUID
- `requestId` (string): Request UUID
- `action` (string): 'approved' or 'rejected'
- `reason` (string, optional): Rejection reason

#### Cancel Request
```javascript
const result = await teamsService.cancelJoinRequest(requestId);
```

#### Get My Requests
```javascript
const myRequests = await teamsService.getMyJoinRequests();
```

**Response:**
```javascript
[
  {
    id: 'uuid',
    teamId: 'uuid',
    teamName: 'Product Team',
    status: 'pending',
    message: 'I would like to join',
    createdAt: '2026-01-03T...'
  }
]
```

### Organization/Admin Methods

#### Update Member Role (Admin Only)
```javascript
import organizationService from '@/services/organizationService';

// Promote to admin
await organizationService.updateMemberRole(memberId, 'admin');

// Demote to user
await organizationService.updateMemberRole(memberId, 'user');
```

**Parameters:**
- `memberId` (string): User UUID
- `role` (string): 'admin' or 'user'

#### Leave Organization
```javascript
// Only works if you're not the sole admin
const result = await organizationService.leaveOrganization();
```

**Response:**
```javascript
{
  message: 'Successfully left organization',
  organization: {
    id: 'new-org-uuid',
    name: 'John Doe\'s Organization',
    contactEmail: 'john@example.com',
    status: 'trial',
    memberCount: 1
  }
}
```

---

## Component Usage Examples

### 1. Join Team Request Component

```jsx
import { JoinTeamRequest } from '@/components/teams/JoinTeamRequest';

export function TeamDetailsPage({ team }) {
  const handleSuccess = () => {
    // Refresh team data or show success message
    console.log('Join request sent!');
  };

  return (
    <div>
      <h1>{team.name}</h1>
      
      {/* Show join request form if user is not a member */}
      {!isMember && (
        <JoinTeamRequest 
          teamId={team.id}
          teamName={team.name}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
```

### 2. Pending Requests Component (Team Lead)

```jsx
import { PendingJoinRequests } from '@/components/teams/PendingJoinRequests';

export function TeamLeadPanel({ team }) {
  return (
    <div>
      <h2>Team Management</h2>
      
      {/* Show join requests for this team */}
      <PendingJoinRequests 
        teamId={team.id}
        teamName={team.name}
      />
    </div>
  );
}
```

### 3. Admin Role Manager Component

```jsx
import { AdminRoleManager } from '@/components/teams/AdminRoleManager';

export function MembersListAdmin({ members }) {
  const handleRoleChange = () => {
    // Refresh members list
    console.log('Role updated!');
  };

  return (
    <table>
      <tbody>
        {members.map(member => (
          <tr key={member.id}>
            <td>{member.firstName} {member.lastName}</td>
            <td>
              {currentUserIsAdmin && (
                <AdminRoleManager 
                  member={member}
                  onSuccess={handleRoleChange}
                />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 4. Admin Handoff Dialog

```jsx
import { useState } from 'react';
import { AdminHandoffDialog } from '@/components/teams/AdminHandoffDialog';

export function SettingsPage() {
  const [showHandoff, setShowHandoff] = useState(false);

  return (
    <div>
      <h2>Organization Settings</h2>
      
      <button onClick={() => setShowHandoff(true)}>
        Leave Organization
      </button>

      <AdminHandoffDialog 
        isOpen={showHandoff}
        onClose={() => setShowHandoff(false)}
        onSuccess={() => {
          // Redirect to new organization page
          window.location.href = '/dashboard';
        }}
      />
    </div>
  );
}
```

---

## Using the Custom Hooks

### useTeamJoinRequests Hook

```jsx
import { useTeamJoinRequests } from '@/hooks/useTeamJoinRequests';

export function RequestJoinForm({ teamId }) {
  const {
    requestJoinTeam,
    getPendingRequests,
    reviewRequest,
    cancelRequest,
    getMyRequests,
    loading,
    error,
  } = useTeamJoinRequests();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await requestJoinTeam(teamId, 'Hello team!');
      console.log('Request sent:', result);
    } catch (error) {
      console.error('Failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" placeholder="Message..." />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Request'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

### useAdminHandoff Hook

```jsx
import { useAdminHandoff } from '@/hooks/useAdminHandoff';

export function LeaveOrgModal() {
  const {
    loadMembers,
    promoteToAdmin,
    leaveOrganization,
    members,
    loading,
    error,
  } = useAdminHandoff();

  useEffect(() => {
    loadMembers();
  }, []);

  const handleLeave = async () => {
    try {
      // First promote selected member
      await promoteToAdmin(selectedMemberId);
      // Then leave organization
      await leaveOrganization();
      // Redirect
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Failed:', error);
    }
  };

  return (
    <div>
      <select onChange={e => setSelectedId(e.target.value)}>
        {members
          .filter(m => m.role !== 'admin')
          .map(m => (
            <option key={m.id} value={m.id}>
              {m.firstName} {m.lastName}
            </option>
          ))}
      </select>
      <button onClick={handleLeave} disabled={loading}>
        {loading ? 'Processing...' : 'Leave Organization'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

---

## Error Handling

All service methods and hooks handle errors gracefully:

```javascript
try {
  await teamsService.requestJoinTeam(teamId, message);
} catch (error) {
  const errorMessage = error.response?.data?.message || error.message;
  
  // Common error codes
  if (error.response?.status === 403) {
    console.log('Forbidden - Check permissions');
  } else if (error.response?.status === 404) {
    console.log('Team not found');
  } else if (error.response?.status === 400) {
    console.log('Bad request - Check data');
  }
}
```

---

## Integration Checklist

- [ ] Copy all new files from this guide
- [ ] Update existing services (teamsService, organizationService)
- [ ] Import and use components where needed
- [ ] Test join request flow
- [ ] Test admin role management
- [ ] Test admin handoff dialog
- [ ] Update team listing UI to show join button
- [ ] Update team lead dashboard to show pending requests
- [ ] Update organization settings to show leave option
- [ ] Add members management section with admin role buttons

---

## API Base URL

The frontend automatically uses the correct API base URL:
- **Development**: `/api` (local)
- **Production**: `https://practicalmanager-4241d0bfc5ed.herokuapp.com/api`

This is configured via `VITE_API_BASE_URL` environment variable.

---

## Testing

To test the endpoints locally:

1. Ensure backend is running on `http://localhost:3000/api`
2. Create test organization with multiple members
3. Test join request: Send request, verify in DB, approve/reject
4. Test admin handoff: Try to leave as sole admin (should fail), promote member, then leave
5. Test team settings: Update team name/description as team lead

---

## Browser Compatibility

All components use modern JavaScript (ES6+) and CSS Modules. Tested on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

---

## Support

For questions or issues:
1. Check the API Integration Guide (backend documentation)
2. Review component prop types
3. Check console for detailed error messages
