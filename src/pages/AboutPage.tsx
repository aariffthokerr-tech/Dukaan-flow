import React from 'react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div className="bg-white">
      <section className="border-b border-neutral-200 bg-neutral-50 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium text-emerald-700">About DukaanFlow</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl text-balance">
            Built so neighborhood and independent shops own their online presence
          </h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-600">
            Local retail businesses should not have to surrender their customer relationships or
            profit margins to crowded aggregator apps. DukaanFlow gives each shop its own dedicated
            digital storefront and operational console.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 p-6">
              <h2 className="font-display text-lg font-semibold text-neutral-900">
                Strict Tenant Isolation
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Every store created on DukaanFlow operates inside an isolated database tenant
                enforced at the PostgreSQL layer with Row Level Security. Only verified shop owners
                can access their private business records.
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 p-6">
              <h2 className="font-display text-lg font-semibold text-neutral-900">
                Practical Counter-First Design
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Shop owners rarely sit at a desk all day. Every view is built mobile-first as a
                Progressive Web App so you can review stock and orders right from your phone.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-neutral-900">
                Have questions about onboarding your shop?
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Reach out to our team or register directly to inspect your workspace.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/contact"
                className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
              >
                Contact Us
              </Link>
              <Link
                to="/register"
                className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-[#111315] px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Create Store
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
