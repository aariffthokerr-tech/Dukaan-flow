import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { checkShopSlugAvailability } from '../services/shopService';
import { SHOP_CATEGORIES } from '../types/database';
import {
  isValidShopSlug,
  slugifyShopName,
  validateRegistrationInput,
} from '../utils/validation';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState<string>(SHOP_CATEGORIES[0]);
  const [shopSlug, setShopSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleShopNameChange = (value: string) => {
    setShopName(value);
    if (!slugTouched) {
      setShopSlug(slugifyShopName(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setShopSlug(slugifyShopName(value));
  };

  useEffect(() => {
    if (!isValidShopSlug(shopSlug)) {
      setSlugAvailable(null);
      return;
    }

    let cancelled = false;
    setCheckingSlug(true);

    const timer = setTimeout(() => {
      void checkShopSlugAvailability(shopSlug)
        .then((available) => {
          if (!cancelled) setSlugAvailable(available);
        })
        .catch(() => {
          if (!cancelled) setSlugAvailable(null);
        })
        .finally(() => {
          if (!cancelled) setCheckingSlug(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shopSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const payload = {
      fullName,
      email,
      password,
      shopName,
      shopCategory,
      shopSlug,
      whatsappNumber,
    };

    const validation = validateRegistrationInput(payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    if (slugAvailable === false) {
      setErrors({ shopSlug: 'This shop slug is already taken. Choose a different slug.' });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await register(payload);
      if (result.requiresEmailConfirmation) {
        setNeedsConfirmation(true);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Registration failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (needsConfirmation) {
    return (
      <div className="bg-neutral-50 py-14 px-4 sm:px-6">
        <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-8">
          <CheckCircle2 className="h-9 w-9 text-emerald-700" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold text-neutral-900">
            Verify your email
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            We sent a confirmation link to <span className="font-medium text-neutral-900">{email}</span>.
            Click the link in your inbox, then sign in to open your shop dashboard.
          </p>
          <Link
            to="/login"
            className="mt-6 flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#111315] px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Continue to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 py-12 sm:py-16 px-4 sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-neutral-900">
            Create your store
          </h1>
          <p className="mt-1.5 text-sm text-neutral-600">
            Register your owner account and provision an isolated shop workspace.
          </p>

          {!isSupabaseConfigured && (
            <p className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-600">
              Running in local browser preview mode. Configure{' '}
              <span className="font-mono">VITE_SUPABASE_URL</span> and{' '}
              <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> to persist accounts to
              your Supabase project.
            </p>
          )}

          {serverError && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} noValidate className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="reg-full-name" className="block text-sm font-medium text-neutral-800">
                  Full name
                </label>
                <input
                  id="reg-full-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Arif Thoker"
                  className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
                {errors.fullName && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-neutral-800">
                  Email address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@yourshop.com"
                  className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-neutral-800">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full min-h-[44px] rounded-lg border border-neutral-300 pl-3.5 pr-11 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-800"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="border-t border-neutral-200 pt-5 space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-shop-name" className="block text-sm font-medium text-neutral-800">
                    Shop name
                  </label>
                  <input
                    id="reg-shop-name"
                    type="text"
                    value={shopName}
                    onChange={(e) => handleShopNameChange(e.target.value)}
                    placeholder="e.g. Kala Clay Goods"
                    className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                  {errors.shopName && (
                    <p className="mt-1.5 text-xs text-red-600">{errors.shopName}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="reg-shop-category"
                    className="block text-sm font-medium text-neutral-800"
                  >
                    Shop category
                  </label>
                  <select
                    id="reg-shop-category"
                    value={shopCategory}
                    onChange={(e) => setShopCategory(e.target.value)}
                    className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    {SHOP_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {errors.shopCategory && (
                    <p className="mt-1.5 text-xs text-red-600">{errors.shopCategory}</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="reg-shop-slug" className="block text-sm font-medium text-neutral-800">
                    Unique shop slug
                  </label>
                  {isValidShopSlug(shopSlug) && (
                    <span
                      className={`text-xs font-medium ${
                        checkingSlug
                          ? 'text-neutral-500'
                          : slugAvailable === false
                            ? 'text-red-600'
                            : slugAvailable === true
                              ? 'text-emerald-700'
                              : 'text-neutral-500'
                      }`}
                    >
                      {checkingSlug
                        ? 'Checking availability...'
                        : slugAvailable === false
                          ? 'Already taken'
                          : slugAvailable === true
                            ? 'Available'
                            : ''}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex rounded-lg border border-neutral-300 focus-within:border-emerald-700 focus-within:ring-1 focus-within:ring-emerald-700 overflow-hidden">
                  <span className="inline-flex items-center bg-neutral-50 px-3 text-xs font-mono text-neutral-500 border-r border-neutral-300 shrink-0">
                    /store/
                  </span>
                  <input
                    id="reg-shop-slug"
                    type="text"
                    value={shopSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="kala-clay-goods"
                    className="w-full min-h-[44px] px-3 py-2 font-mono text-sm text-neutral-900 focus:outline-none"
                  />
                </div>
                {errors.shopSlug && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.shopSlug}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="reg-whatsapp"
                  className="block text-sm font-medium text-neutral-800"
                >
                  WhatsApp business number
                </label>
                <input
                  id="reg-whatsapp"
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+919876543210"
                  className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 font-mono text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Include country code (7–15 digits, e.g. +919876543210).
                </p>
                {errors.whatsappNumber && (
                  <p className="mt-1 text-xs text-red-600">{errors.whatsappNumber}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[46px] rounded-lg bg-[#111315] px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? 'Creating store...' : 'Create Store Account'}
            </button>
          </form>

          <p className="mt-6 border-t border-neutral-200 pt-5 text-center text-sm text-neutral-600">
            Already have a shop account?{' '}
            <Link to="/login" className="font-medium text-emerald-700 hover:text-emerald-800">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
