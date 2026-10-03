import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "../components/layout/PublicLayout";
import { RouteErrorBoundary } from "../components/layout/RouteErrorBoundary";
import { seoContentPages } from "../lib/seoContent";
import { AboutPage } from "../pages/public/AboutPage";
import { ContactPage } from "../pages/public/ContactPage";
import { DMCAPage } from "../pages/public/DMCAPage";
import { HomePage } from "../pages/public/HomePage";
import { PrivacyPolicyPage } from "../pages/public/PrivacyPolicyPage";
import { SeoLandingPage } from "../pages/public/SeoLandingPage";
import { SupportedPlatformsPage } from "../pages/public/SupportedPlatformsPage";
import { TermsOfServicePage } from "../pages/public/TermsOfServicePage";

function lazyWithRetry(
  factory: Parameters<typeof lazy>[0]
): ReturnType<typeof lazy> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (typeof window !== "undefined") {
        const reloadKey = "fastvid_lazy_retry";
        const lastReload = sessionStorage.getItem(reloadKey);
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem(reloadKey, String(now));
          window.location.reload();
          return new Promise<never>(() => {});
        }
      }
      throw error;
    }
  });
}

const ProtectedAdminRoute = lazyWithRetry(() =>
  import("../components/admin/ProtectedAdminRoute").then((module) => ({
    default: module.ProtectedAdminRoute
  }))
);
const AdminLayout = lazyWithRetry(() =>
  import("../components/layout/AdminLayout").then((module) => ({ default: module.AdminLayout }))
);
const AdminLoginPage = lazyWithRetry(() =>
  import("../pages/admin/AdminLoginPage").then((module) => ({ default: module.AdminLoginPage }))
);
const DashboardOverviewPage = lazyWithRetry(() =>
  import("../pages/admin/DashboardOverviewPage").then((module) => ({
    default: module.DashboardOverviewPage
  }))
);
const SiteSettingsPage = lazyWithRetry(() =>
  import("../pages/admin/SiteSettingsPage").then((module) => ({ default: module.SiteSettingsPage }))
);
const PlatformsPage = lazyWithRetry(() =>
  import("../pages/admin/PlatformsPage").then((module) => ({ default: module.PlatformsPage }))
);
const ProvidersPage = lazyWithRetry(() =>
  import("../pages/admin/ProvidersPage").then((module) => ({ default: module.ProvidersPage }))
);
const AdsPage = lazyWithRetry(() =>
  import("../pages/admin/AdsPage").then((module) => ({ default: module.AdsPage }))
);
const SecurityPage = lazyWithRetry(() =>
  import("../pages/admin/SecurityPage").then((module) => ({ default: module.SecurityPage }))
);
const RequestLogsPage = lazyWithRetry(() =>
  import("../pages/admin/RequestLogsPage").then((module) => ({ default: module.RequestLogsPage }))
);
const AuditLogsPage = lazyWithRetry(() =>
  import("../pages/admin/AuditLogsPage").then((module) => ({ default: module.AuditLogsPage }))
);
const SystemStatusPage = lazyWithRetry(() =>
  import("../pages/admin/SystemStatusPage").then((module) => ({ default: module.SystemStatusPage }))
);

function lazyElement(element: ReactNode) {
  return <Suspense fallback={<div className="p-4 text-sm text-slate-600">Memuat...</div>}>{element}</Suspense>;
}

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/platforms", element: <SupportedPlatformsPage /> },
      ...seoContentPages.map((config) => ({
        path: config.path,
        element: <SeoLandingPage config={config} />
      })),
      { path: "/terms", element: <TermsOfServicePage /> },
      { path: "/privacy", element: <PrivacyPolicyPage /> },
      { path: "/dmca", element: <DMCAPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "/about", element: <AboutPage /> }
    ]
  },
  {
    path: "/admin/login",
    element: lazyElement(<AdminLoginPage />),
    errorElement: <RouteErrorBoundary />
  },
  {
    path: "/admin",
    element: lazyElement(<ProtectedAdminRoute />),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: lazyElement(<AdminLayout />),
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: lazyElement(<DashboardOverviewPage />) },
          { path: "settings", element: lazyElement(<SiteSettingsPage />) },
          { path: "platforms", element: lazyElement(<PlatformsPage />) },
          { path: "providers", element: lazyElement(<ProvidersPage />) },
          { path: "ads", element: lazyElement(<AdsPage />) },
          { path: "security", element: lazyElement(<SecurityPage />) },
          { path: "request-logs", element: lazyElement(<RequestLogsPage />) },
          { path: "audit-logs", element: lazyElement(<AuditLogsPage />) },
          { path: "system-status", element: lazyElement(<SystemStatusPage />) }
        ]
      }
    ]
  }
]);
