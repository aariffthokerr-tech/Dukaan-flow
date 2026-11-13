import React from 'react';
import { ArrowRight, Database, Lock, Smartphone, Store, ShieldCheck, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

const CAPABILITIES = [
  {
    icon: Lock,
    title: 'Multi-Tenant Row Level Security',
    description:
      'All tenant tables—shops, categories, products, product images, orders, order items, and subscriptions—enforce strict PostgreSQL RLS ownership checks.',
  },
  {
    icon: Store,
    title: 'Unique Shop Slugs & Identity',
    description:
      'Every shop claims a clean, validated URL slug at registration alongside its category, description, and WhatsApp business contact.',
  },
  {
    icon: Database,
    title: 'Structured Commerce Schema',
    description:
      'Pre-built PostgreSQL tables with UUID primary keys, composite foreign keys, and check constraints preserve data integrity as your store expands.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access Control',
    description:
      'Strict separation between Super Admin, Shop Owner, and Customer roles prevents privilege escalation and protects private business data.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-First PWA Experience',
    description:
      'Installable Progressive Web App manifest and responsive dashboard navigation keep counter operations fast on phones and tablets.',
  },
  {
    icon: Layers,
    title: 'Modular 4-Part Architecture',
    description:
      'Part 1 establishes authentication, tenant provisioning, and dashboard metrics cleanly ready for catalog, storefront, and billing modules.',
  },
];

export const FeaturesPage: React.FC = () => {
  return (
    <div className="bg-white">
      <section className="border-b border-neutral-200 bg-neutral-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium text-emerald-700">Platform Capabilities</p>
          <h1 className="mt-2 max-w-3xl font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl text-balance">
            Purpose-built software for independent retail teams
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600">
            DukaanFlow combines isolated PostgreSQL multi-tenancy with an uncluttered shop
            management interface designed for daily store operations.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-neutral-200 bg-white p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-emerald-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="mt-4 font-display text-base font-semibold text-neutral-900">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8 justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-neutral-900">
                Create your shop account today
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Provision your tenant workspace and reserve your storefront slug in under a minute.
              </p>
            </div>
            <Link
              to="/register"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#111315] px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"
            >
              <span>Create Your Store</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
