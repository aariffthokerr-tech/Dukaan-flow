import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StorefrontPreviewWidget } from '../components/marketing/StorefrontPreviewWidget';

export const DemoPreviewPage: React.FC = () => {
  return (
    <div className="bg-white">
      <section className="border-b border-neutral-200 bg-neutral-50 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-medium text-emerald-700">Interactive Demo Preview</p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                Explore the DukaanFlow storefront layout
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
                Preview how individual tenant storefronts render for customers. Register an account
                to access your own private Shop Owner dashboard and reserve your slug.
              </p>
            </div>
            <Link
              to="/register"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#111315] px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Create Your Store</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
          <StorefrontPreviewWidget />

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="font-display text-sm font-semibold text-neutral-900">
                  Real accounts start with a clean empty workspace
                </h2>
                <p className="mt-1 text-xs text-neutral-600">
                  When you register your own shop, your dashboard displays genuine database counts
                  (starting at zero) with no fabricated orders or dummy products.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-100 whitespace-nowrap shrink-0"
            >
              Sign in to existing shop
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
