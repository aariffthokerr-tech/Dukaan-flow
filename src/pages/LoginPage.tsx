import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { validateLoginInput } from '../utils/validation';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = validateLoginInput(email, password);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      const nextTarget =
        result.profile?.role === 'super_admin' && redirectTarget === '/dashboard'
          ? '/admin'
          : redirectTarget;
      navigate(nextTarget, { replace: true });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Unable to sign in. Check your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-neutral-50 py-12 sm:py-16 px-4 sm:px-6">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-neutral-900">
            Sign in to your shop
          </h1>
          <p className="mt-1.5 text-sm text-neutral-600">
            Access your DukaanFlow owner dashboard and store settings.
          </p>

          {!isSupabaseConfigured && (
            <p className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-600">
              Running in local browser preview mode. Configure{' '}
              <span className="font-mono">VITE_SUPABASE_URL</span> and{' '}
              <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> to connect your live
              Supabase backend.
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
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-neutral-800">
                Email address
              </label>
              <input
                id="login-email"
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

            <div>
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-neutral-800"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[46px] rounded-lg bg-[#111315] px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 border-t border-neutral-200 pt-5 text-center text-sm text-neutral-600">
            New to DukaanFlow?{' '}
            <Link to="/register" className="font-medium text-emerald-700 hover:text-emerald-800">
              Create your store
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
