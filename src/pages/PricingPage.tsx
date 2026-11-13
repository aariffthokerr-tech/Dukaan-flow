import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    audience: 'For single-location independent shops',
    monthly: 0,
    annual: 0,
    limits: [
      '1 isolated shop workspace',
      'Unique dukaanflow.app/store/slug URL',
      'Up to 25 products & 10 categories',
      'Up to 3 images per product',
      'Basic counts & WhatsApp enquiries',
    ],
    cta: 'Create Free Store',
    to: '/register',
    dark: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    audience: 'For active stores expanding online orders',
    monthly: 999,
    annual: 799,
    limits: [
      '1 isolated shop workspace',
      'Up to 150 products & 25 categories',
      'Up to 5 images per product',
      'Basic + product view analytics',
      'Custom storefront branding',
    ],
    cta: 'Choose Basic',
    to: '/register',
    dark: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    audience: 'For high-volume retail merchants',
    monthly: 2499,
    annual: 1999,
    limits: [
      'Up to 1,000 products & 100 categories',
      'Up to 10 images per product',
      'Advanced store & enquiry analytics',
      'Full storefront customization',
      'Priority onboarding assistance',
    ],
    cta: 'Choose Pro',
    to: '/register',
    dark: false,
  },
];

export const PricingPage: React.FC = () => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="bg-white">
      <section className="border-b border-neutral-200 bg-neutral-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-emerald-700">Transparent Pricing</p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                Simple plans with zero transaction fees
              </h1>
              <p className="mt-3 text-base text-neutral-600">
                Keep 100% of your retail margin. Every tier runs on the same isolated PostgreSQL
                security foundation.
              </p>
            </div>

            <div
              role="group"
              aria-label="Billing frequency"
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1 self-start"
            >
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  billing === 'monthly'
                    ? 'bg-[#111315] text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling('annual')}
                className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  billing === 'annual'
                    ? 'bg-[#111315] text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Annual (Save 20%)
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => {
              const price = billing === 'monthly' ? plan.monthly : plan.annual;
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col justify-between rounded-xl border p-6 sm:p-8 ${
                    plan.dark
                      ? 'border-[#111315] bg-[#111315] text-white'
                      : 'border-neutral-200 bg-white text-neutral-900'
                  }`}
                >
                  <div>
                    <h2 className="font-display text-lg font-semibold">{plan.name}</h2>
                    <p
                      className={`mt-1 text-xs ${
                        plan.dark ? 'text-neutral-300' : 'text-neutral-600'
                      }`}
                    >
                      {plan.audience}
                    </p>

                    <div className="mt-6 flex items-baseline gap-2">
                      <span className="font-mono text-3xl font-bold tabular-nums">
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      <span
                        className={`text-xs ${
                          plan.dark ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        {price === 0 ? 'Free foundation tier' : 'per month, billed ' + billing}
                      </span>
                    </div>

                    <ul className="mt-6 space-y-3 text-sm">
                      {plan.limits.map((limit) => (
                        <li key={limit} className="flex items-start gap-2.5">
                          <Check
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              plan.dark ? 'text-emerald-400' : 'text-emerald-700'
                            }`}
                            aria-hidden="true"
                          />
                          <span className={plan.dark ? 'text-neutral-200' : 'text-neutral-700'}>
                            {limit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8">
                    <Link
                      to={plan.to}
                      className={`flex min-h-[44px] w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                        plan.dark
                          ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                          : 'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
