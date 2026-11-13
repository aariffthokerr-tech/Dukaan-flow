import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Lock,
  Smartphone,
  Store,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StorefrontPreviewWidget } from '../components/marketing/StorefrontPreviewWidget';

const FEATURES_OVERVIEW = [
  {
    number: '01',
    title: 'Isolated Shop Workspaces',
    description:
      'Every merchant receives an independent database tenant enforced with PostgreSQL Row Level Security. Products, customers, and orders never cross shop boundaries.',
    span: 'lg:col-span-2',
  },
  {
    number: '02',
    title: 'Dedicated Storefront Slug',
    description:
      'Reserve your unique web address at registration and configure your shop category and WhatsApp business contact.',
    span: 'lg:col-span-1',
  },
  {
    number: '03',
    title: 'Mobile-First PWA Console',
    description:
      'Install DukaanFlow directly on Android, iOS, or desktop to check inventory and incoming orders from the counter.',
    span: 'lg:col-span-1',
  },
  {
    number: '04',
    title: 'Built for WhatsApp Commerce',
    description:
      'Connect your verified WhatsApp business number so customers can confirm orders directly with your shop team.',
    span: 'lg:col-span-2',
  },
];

const HOW_IT_WORKS = [
  {
    step: 'Step 01',
    title: 'Register your shop account',
    description:
      'Create your owner credentials, claim a unique shop slug, and link your WhatsApp business number in one step.',
  },
  {
    step: 'Step 02',
    title: 'Prepare your catalog & profile',
    description:
      'Configure your shop description, address, and category inside your private owner dashboard.',
  },
  {
    step: 'Step 03',
    title: 'Publish and manage orders',
    description:
      'Share your storefront link with local buyers and track pending and completed orders from one dashboard.',
  },
];

const PRICING_TIERS = [
  {
    name: 'Starter',
    audience: 'For single-location independent shops',
    monthlyPrice: '₹0',
    period: 'Free foundation tier',
    cta: 'Create Your Store',
    highlighted: false,
    limits: [
      '1 isolated shop workspace',
      'Unique dukaanflow.app/store/slug URL',
      'Up to 25 products & 10 categories',
      'WhatsApp enquiry cart routing',
    ],
  },
  {
    name: 'Basic',
    audience: 'For active retail stores scaling online orders',
    monthlyPrice: '₹999',
    period: 'per month per shop',
    cta: 'Start with Basic',
    highlighted: true,
    limits: [
      'Up to 150 products & 25 categories',
      'Up to 5 images per product',
      'Product view & enquiry analytics',
      'Custom storefront branding',
    ],
  },
  {
    name: 'Pro',
    audience: 'For high-volume regional merchants',
    monthlyPrice: '₹2,499',
    period: 'per month per shop',
    cta: 'Start with Pro',
    highlighted: false,
    limits: [
      'Up to 1,000 products & 100 categories',
      'Up to 10 images per product',
      'Advanced catalog & order analytics',
      'Priority onboarding support',
    ],
  },
];

const FAQS = [
  {
    question: 'How is my shop data kept separate from other businesses?',
    answer:
      'DukaanFlow stores every shop under its own shop identifier and enforces strict PostgreSQL Row Level Security policies. Authenticated shop owners can only query and update records belonging to their own shop.',
  },
  {
    question: 'Do I need technical skills to set up my store?',
    answer:
      'No. Registration creates your owner profile, provisions your shop workspace, and reserves your unique URL slug automatically. You can manage everything from any phone or desktop browser.',
  },
  {
    question: 'Can I use DukaanFlow on my phone at the shop counter?',
    answer:
      'Yes. DukaanFlow is built with a mobile-first responsive layout and Progressive Web App support, so you can install it onto your home screen like a native app.',
  },
  {
    question: 'How do plan upgrades and limits work?',
    answer:
      'Shops start on Starter with database-enforced product, category, and image limits. Owners can submit an upgrade request from their dashboard for manual review and activation by platform administration.',
  },
];

export const LandingPage: React.FC = () => {
  const [heroImageError, setHeroImageError] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div>
      {/* Hero Section */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium text-emerald-700">
                Multi-Tenant Retail Platform
              </p>
              <h1 className="mt-3 font-display text-[clamp(2.25rem,4vw,3.75rem)] font-bold leading-[1.08] tracking-tight text-neutral-900 text-balance">
                Your Shop. Your Online Store.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">
                Launch an isolated digital storefront for your retail business without marketplace
                commissions. Manage products, stock levels, and customer orders from one calm,
                mobile-ready workspace.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-[#111315] px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"
                >
                  <span>Create Your Store</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/demo"
                  className="inline-flex min-h-[46px] items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50 transition-colors whitespace-nowrap"
                >
                  Explore Demo
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-4 border-t border-neutral-200 pt-6 sm:grid-cols-3 text-xs text-neutral-600">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Row-level tenant isolation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Installable mobile PWA</span>
                </div>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Dedicated shop slug</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
                {heroImageError ? (
                  <div className="flex h-full min-h-[320px] flex-col items-center justify-center bg-[#111315] p-8 text-center text-white">
                    <Store className="h-10 w-10 text-emerald-500" />
                    <p className="mt-4 font-display text-lg font-semibold">
                      Built for Modern Independent Retail
                    </p>
                  </div>
                ) : (
                  <img
                    src="/src/assets/images/hero_modern_boutique_1794579349467.jpg"
                    alt="Modern independent retail store interior with dark steel shelving and warm oak counter"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImageError(true)}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="border-b border-neutral-200 bg-neutral-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-emerald-700">Platform Architecture</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl text-balance">
              Focused retail infrastructure without marketplace clutter
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {FEATURES_OVERVIEW.map((feature) => (
              <div
                key={feature.number}
                className={`rounded-xl border border-neutral-200 bg-white p-6 sm:p-7 ${feature.span}`}
              >
                <p className="font-mono text-xs font-medium text-emerald-700">
                  {feature.number}.
                </p>
                <h3 className="mt-3 font-display text-lg font-semibold text-neutral-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b border-neutral-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-emerald-700">How It Works</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              From shop counter to online storefront in three steps
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-6"
              >
                <p className="font-mono text-xs font-medium text-neutral-500">{item.step}</p>
                <h3 className="mt-3 font-display text-base font-semibold text-neutral-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Storefront Preview */}
      <section className="border-b border-neutral-200 bg-neutral-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-emerald-700">Storefront Preview</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                Clean, fast product browsing on every screen
              </h2>
              <p className="mt-2 text-sm text-neutral-600">
                Switch between sample categories below to preview how your shop storefront presents
                products under your own slug.
              </p>
            </div>
            <Link
              to="/demo"
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0"
            >
              Open full demo view
            </Link>
          </div>

          <div className="mt-8">
            <StorefrontPreviewWidget />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="border-b border-neutral-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-emerald-700">Pricing</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Predictable plans for every stage of your shop
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Start on the free Starter foundation tier and upgrade only when your catalog grows.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`flex flex-col justify-between rounded-xl border p-6 sm:p-7 ${
                  tier.highlighted
                    ? 'border-[#111315] bg-[#111315] text-white'
                    : 'border-neutral-200 bg-white text-neutral-900'
                }`}
              >
                <div>
                  <h3 className="font-display text-lg font-semibold">{tier.name}</h3>
                  <p
                    className={`mt-1 text-xs ${
                      tier.highlighted ? 'text-neutral-300' : 'text-neutral-600'
                    }`}
                  >
                    {tier.audience}
                  </p>

                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-bold tabular-nums">
                      {tier.monthlyPrice}
                    </span>
                    <span
                      className={`text-xs ${
                        tier.highlighted ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      {tier.period}
                    </span>
                  </div>

                  <ul className="mt-6 space-y-3 text-sm">
                    {tier.limits.map((limit) => (
                      <li key={limit} className="flex items-start gap-2.5">
                        <Check
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            tier.highlighted ? 'text-emerald-400' : 'text-emerald-700'
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={tier.highlighted ? 'text-neutral-200' : 'text-neutral-700'}
                        >
                          {limit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Link
                    to="/register"
                    className={`flex min-h-[44px] w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                      tier.highlighted
                        ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                        : 'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-b border-neutral-200 bg-neutral-50 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-medium text-emerald-700">FAQ</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Common questions
            </h2>
          </div>

          <div className="mt-10 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {FAQS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={item.question} className="px-6 py-4">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="flex min-h-[44px] w-full items-center justify-between gap-4 text-left"
                  >
                    <span className="font-display text-sm font-semibold text-neutral-900 sm:text-base">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-neutral-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-2 pb-2 text-sm leading-relaxed text-neutral-600">
                      {item.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#111315] py-16 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready to set up your shop workspace?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-neutral-300">
              Reserve your shop slug and start organizing your retail operations in minutes.
            </p>
          </div>
          <Link
            to="/register"
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-600 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Create Your Store</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
};
