import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute';
import { AuthProvider } from './contexts/AuthContext';
import { PublicLayout } from './layouts/PublicLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

const DashboardLayout = lazy(() =>
  import('./layouts/DashboardLayout').then((m) => ({ default: m.DashboardLayout }))
);
const AdminLayout = lazy(() =>
  import('./layouts/AdminLayout').then((m) => ({ default: m.AdminLayout }))
);

const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((m) => ({ default: m.AboutPage }))
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const DemoPreviewPage = lazy(() =>
  import('./pages/DemoPreviewPage').then((m) => ({ default: m.DemoPreviewPage }))
);
const FeaturesPage = lazy(() =>
  import('./pages/FeaturesPage').then((m) => ({ default: m.FeaturesPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const PricingPage = lazy(() =>
  import('./pages/PricingPage').then((m) => ({ default: m.PricingPage }))
);
const OfflinePage = lazy(() =>
  import('./pages/OfflinePage').then((m) => ({ default: m.OfflinePage }))
);

const StorefrontPage = lazy(() =>
  import('./pages/StorefrontPage').then((m) => ({ default: m.StorefrontPage }))
);
const StorefrontProductPage = lazy(() =>
  import('./pages/StorefrontProductPage').then((m) => ({
    default: m.StorefrontProductPage,
  }))
);

const DashboardOverviewPage = lazy(() =>
  import('./pages/DashboardOverviewPage').then((m) => ({
    default: m.DashboardOverviewPage,
  }))
);
const DashboardProductsPage = lazy(() =>
  import('./pages/DashboardProductsPage').then((m) => ({
    default: m.DashboardProductsPage,
  }))
);
const DashboardCategoriesPage = lazy(() =>
  import('./pages/DashboardCategoriesPage').then((m) => ({
    default: m.DashboardCategoriesPage,
  }))
);
const DashboardOrdersPage = lazy(() =>
  import('./pages/DashboardOrdersPage').then((m) => ({
    default: m.DashboardOrdersPage,
  }))
);
const DashboardAnalyticsPage = lazy(() =>
  import('./pages/DashboardAnalyticsPage').then((m) => ({
    default: m.DashboardAnalyticsPage,
  }))
);
const DashboardBillingPage = lazy(() =>
  import('./pages/DashboardBillingPage').then((m) => ({
    default: m.DashboardBillingPage,
  }))
);
const DashboardStorefrontPage = lazy(() =>
  import('./pages/DashboardStorefrontPage').then((m) => ({
    default: m.DashboardStorefrontPage,
  }))
);
const DashboardSettingsPage = lazy(() =>
  import('./pages/DashboardSettingsPage').then((m) => ({
    default: m.DashboardSettingsPage,
  }))
);

const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  }))
);

function LegacyStorefrontRedirect() {
  const { slug = '' } = useParams<{ slug: string }>();
  return <Navigate to={`/store/${slug}`} replace />;
}

function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        <p className="text-xs font-medium text-neutral-500">Loading view...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public Marketing & Auth Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/demo" element={<DemoPreviewPage />} />
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <LoginPage />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicOnlyRoute>
                    <RegisterPage />
                  </PublicOnlyRoute>
                }
              />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Offline Fallback Route */}
            <Route path="/offline" element={<OfflinePage />} />

            {/* Individual Public Shop Storefronts */}
            <Route path="/store/:slug" element={<StorefrontPage />} />
            <Route
              path="/store/:slug/product/:productSlug"
              element={<StorefrontProductPage />}
            />
            <Route path="/s/:slug" element={<LegacyStorefrontRedirect />} />

            {/* Protected Shop Owner Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['shop_owner', 'super_admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardOverviewPage />} />
              <Route path="products" element={<DashboardProductsPage />} />
              <Route path="categories" element={<DashboardCategoriesPage />} />
              <Route path="orders" element={<DashboardOrdersPage />} />
              <Route path="analytics" element={<DashboardAnalyticsPage />} />
              <Route path="plan" element={<DashboardBillingPage />} />
              <Route path="storefront" element={<DashboardStorefrontPage />} />
              <Route path="settings" element={<DashboardSettingsPage />} />
            </Route>

            {/* Protected Super Admin Console */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
