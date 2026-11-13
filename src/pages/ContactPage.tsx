import React, { useState } from 'react';
import { CheckCircle2, Mail, MapPin, MessageCircle } from 'lucide-react';
import { validateContactInput } from '../utils/validation';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateContactInput({ name, email, shopName, message });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setSubmitted(true);
  };

  return (
    <div className="bg-white">
      <section className="border-b border-neutral-200 bg-neutral-50 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-medium text-emerald-700">Contact</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Get in touch with DukaanFlow
          </h1>
          <p className="mt-3 max-w-2xl text-base text-neutral-600">
            Questions about setting up your shop, migration, or Scale tier plans? Send us a note
            and our onboarding team will respond.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-6 space-y-5">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-emerald-700 shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-sm font-semibold text-neutral-900">Email</h2>
                  <p className="mt-1 text-sm text-neutral-600">support@dukaanflow.app</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageCircle
                  className="mt-0.5 h-5 w-5 text-emerald-700 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="font-display text-sm font-semibold text-neutral-900">
                    Merchant Onboarding
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Monday – Saturday, 9:30 AM – 6:30 PM IST
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-emerald-700 shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-sm font-semibold text-neutral-900">
                    Operations
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">Bengaluru, India</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {submitted ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-8">
                <CheckCircle2 className="h-8 w-8 text-emerald-700" aria-hidden="true" />
                <h2 className="mt-4 font-display text-xl font-semibold text-neutral-900">
                  Message received
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                  Thank you, {name}. Your inquiry for {shopName || 'your shop'} has been recorded
                  and we will follow up at <span className="font-medium">{email}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setEmail('');
                    setShopName('');
                    setMessage('');
                  }}
                  className="mt-6 inline-flex min-h-[42px] items-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-5"
              >
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-neutral-800">
                    Full name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Riya Sharma"
                    className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                  {errors.name && (
                    <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-neutral-800">
                    Email address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourshop.com"
                    className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-shop" className="block text-sm font-medium text-neutral-800">
                    Shop name (optional)
                  </label>
                  <input
                    id="contact-shop"
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Kala Clay Goods"
                    className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-sm font-medium text-neutral-800"
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your store and how we can help..."
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                  {errors.message && (
                    <p className="mt-1.5 text-xs text-red-600">{errors.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[46px] rounded-lg bg-[#111315] px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
