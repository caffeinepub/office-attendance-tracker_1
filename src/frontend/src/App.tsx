import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import React from "react";
import AuthGuard from "./components/AuthGuard";
import Layout from "./components/Layout";
import ProfileSetup from "./components/ProfileSetup";
import { useNotificationReminders } from "./hooks/useNotificationReminders";
import Analytics from "./pages/Analytics";
import CompOffBalance from "./pages/CompOffBalance";
import DailyEntry from "./pages/DailyEntry";
import Dashboard from "./pages/Dashboard";
import Export from "./pages/Export";
import Holidays from "./pages/Holidays";
import Leaves from "./pages/Leaves";

// Root route with Layout as the shell
const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DailyEntry,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: Dashboard,
});

const leavesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/leaves",
  component: Leaves,
});

const compOffRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/comp-off",
  component: CompOffBalance,
});

const holidaysRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/holidays",
  component: Holidays,
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analytics",
  component: Analytics,
});

const exportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/export",
  component: Export,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  leavesRoute,
  compOffRoute,
  holidaysRoute,
  analyticsRoute,
  exportRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
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
