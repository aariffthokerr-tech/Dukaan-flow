import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, profile, shop } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-300 border-t-emerald-700" />
      </div>
    );
  }

  if (isAuthenticated && profile?.role === 'super_admin' && !shop) {
    return <Navigate to="/admin" replace />;
  }

  if (isAuthenticated && (profile?.role === 'shop_owner' || profile?.role === 'super_admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
