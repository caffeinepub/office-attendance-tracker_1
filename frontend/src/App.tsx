import React from 'react';
import { createRouter, createRoute, createRootRoute, RouterProvider } from '@tanstack/react-router';
import AuthGuard from './components/AuthGuard';
import ProfileSetup from './components/ProfileSetup';
import Layout from './components/Layout';
import DailyEntry from './pages/DailyEntry';
import Dashboard from './pages/Dashboard';
import Leaves from './pages/Leaves';
import Analytics from './pages/Analytics';
import Export from './pages/Export';
import { useNotificationReminders } from './hooks/useNotificationReminders';

// Root route with Layout as the shell
const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DailyEntry,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: Dashboard,
});

const leavesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leaves',
  component: Leaves,
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: Analytics,
});

const exportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/export',
  component: Export,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  leavesRoute,
  analyticsRoute,
  exportRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function AppContent() {
  useNotificationReminders();

  return (
    <>
      <RouterProvider router={router} />
      <ProfileSetup />
    </>
  );
}

export default function App() {
  return (
    <AuthGuard>
      <AppContent />
    </AuthGuard>
  );
}
