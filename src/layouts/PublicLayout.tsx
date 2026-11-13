import React from 'react';
import { Outlet } from 'react-router-dom';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { PublicFooter } from '../components/marketing/PublicFooter';
import { PublicHeader } from '../components/marketing/PublicHeader';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 overflow-x-hidden">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
      <OfflineBanner />
    </div>
  );
};
