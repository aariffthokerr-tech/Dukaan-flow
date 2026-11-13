import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';

export const OfflinePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
          <WifiOff className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-bold text-neutral-900">
          You are currently offline
        </h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          An active connection is required to load live storefronts, update inventory,
          upload images, or access protected shop data. Private records are not cached on
          this device.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[#111315] px-5 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Retry Connection</span>
          </button>
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex min-h-[42px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};
