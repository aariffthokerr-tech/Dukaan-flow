import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-300 border-t-emerald-700" />
          <p className="text-sm font-medium text-neutral-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const fallbackPath =
      profile.role === 'shop_owner'
        ? '/dashboard'
        : profile.role === 'super_admin'
          ? '/admin'
          : '/';
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
