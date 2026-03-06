# PM-Frontend

React SPA for Practical Manager. Deployed on GitHub Pages (`evoli-management.github.io/PM-frontend`).

## Stack

- **Framework**: React 18 + Vite
- **Routing**: React Router (hash-based)
- **Styling**: Tailwind CSS
- **Package manager**: pnpm

## Local Development

```bash
pnpm install
pnpm dev
```

## Build & Deploy

```bash
pnpm build
# GitHub Actions auto-deploys main branch to gh-pages
```

## Key Pages & Components

| Path | Description |
|------|-------------|
| `src/pages/KeyAreas.jsx` | Main key areas view — task lists, tabs, delegations |
| `src/pages/DontForget.jsx` | Don't Forget key area with imported tasks filter |
| `src/pages/Tasks.jsx` | All tasks view |
| `src/components/key-areas/PendingDelegationsSection.jsx` | Accept/reject incoming task delegations |
| `src/components/key-areas/CreateTaskModal.jsx` | Create task modal with list selector |
| `src/services/` | API client wrappers (keyAreaService, taskService, etc.) |

## Sync Integration

The frontend triggers sync via PM-backend API endpoints. Calendar and task sync status is reflected in real time after sync completes.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | PM-backend API base URL |
